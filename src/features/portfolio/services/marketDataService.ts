import {
  getQuote,
  searchStocks,
  TwelveDataConfigurationError,
  TwelveDataRateLimitError,
} from "../../../services/stockApi";
import { getMutualFund } from "../../../services/mutualFundService";
import { getCryptoQuotes } from "../../../services/cryptoService";
import {
  cryptoQuoteKey,
  mfQuoteKey,
  parseCryptoCoinId,
  parseMfSchemeCode,
} from "../../../types/market";
import type { Exchange, Holding, InstrumentType, MarketQuote, SearchResult } from "../types";
import { inferInstrumentType } from "../utils/formatSymbol";
import { searchLocalSymbols } from "../data/indianSymbols";
import { getCryptoCoin } from "../data/cryptoCoins";

const REFRESH_MS = 15 * 60 * 1000;
const SEARCH_MIN_LENGTH = 2;
const CACHE_TTL_MS = REFRESH_MS;

export { TwelveDataRateLimitError as MarketDataRateLimitError };

const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown, ttlMs = CACHE_TTL_MS) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function exchangeFromSymbol(symbol: string): Exchange {
  const normalized = symbol.toUpperCase();
  if (normalized.startsWith("MF:")) return "NSE";
  if (normalized.startsWith("CRYPTO:")) return "US";
  if (normalized.endsWith(".BO")) return "BSE";
  if (normalized.endsWith(".NS")) return "NSE";
  return "US";
}

function mapInstrumentType(type: string, ticker: string, name: string): InstrumentType {
  if (type.toUpperCase().includes("ETF")) return "etf";
  return inferInstrumentType(ticker, name);
}

function mergeSearchResults(local: SearchResult[], remote: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return [...local, ...remote]
    .filter((item) => {
      if (seen.has(item.yahooSymbol)) return false;
      seen.add(item.yahooSymbol);
      return true;
    })
    .slice(0, 12);
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const local = searchLocalSymbols(trimmed);
  if (trimmed.length < SEARCH_MIN_LENGTH) return local;

  try {
    const remote = await searchStocks(trimmed);
    return mergeSearchResults(
      local,
      remote.map((item) => ({
        symbol: item.ticker,
        name: item.name,
        exchange: exchangeFromSymbol(item.ticker),
        instrumentType: mapInstrumentType(item.type, item.ticker, item.name),
        yahooSymbol: item.ticker,
      }))
    );
  } catch (error) {
    if (local.length > 0 || error instanceof TwelveDataConfigurationError) return local;
    throw error;
  }
}

function isMfKey(key: string): boolean {
  return key.toUpperCase().startsWith("MF:") || /^\d+$/.test(key.trim());
}

function isCryptoKey(key: string): boolean {
  return key.toUpperCase().startsWith("CRYPTO:");
}

async function fetchStockQuoteMapped(marketSymbol: string): Promise<MarketQuote | null> {
  const cacheKey = `quote:${marketSymbol}`;
  const cached = getCached<MarketQuote>(cacheKey);
  if (cached) return cached;

  try {
    const quote = await getQuote(marketSymbol);
    const mapped: MarketQuote = {
      symbol: quote.ticker || marketSymbol,
      name: quote.name,
      exchange: exchangeFromSymbol(quote.ticker || marketSymbol),
      currency: quote.currency,
      currentPrice: quote.price,
      previousClose: quote.previousClose,
      dayChange: quote.change,
      dayChangePercent: quote.changePercent,
      fiftyTwoWeekHigh: quote.price,
      fiftyTwoWeekLow: quote.price,
      volume: 0,
      lastUpdated: quote.lastUpdated,
    };
    setCache(cacheKey, mapped);
    return mapped;
  } catch (error) {
    if (!(error instanceof TwelveDataConfigurationError)) {
      console.warn(`Stock quote failed for ${marketSymbol}:`, error);
    }
    return null;
  }
}

async function fetchMfQuoteMapped(schemeCode: string, quoteKey: string): Promise<MarketQuote | null> {
  const cacheKey = `quote:${quoteKey}`;
  const cached = getCached<MarketQuote>(cacheKey);
  if (cached) return cached;

  try {
    const fund = await getMutualFund(schemeCode);
    const previousClose = fund.previousNav ?? fund.nav;
    const mapped: MarketQuote = {
      symbol: fund.schemeCode,
      name: fund.schemeName,
      exchange: "NSE",
      currency: fund.currency || "INR",
      currentPrice: fund.nav,
      previousClose,
      dayChange: fund.change,
      dayChangePercent: fund.changePercent,
      fiftyTwoWeekHigh: fund.nav,
      fiftyTwoWeekLow: fund.nav,
      volume: 0,
      lastUpdated: fund.date,
    };
    setCache(cacheKey, mapped);
    return mapped;
  } catch (error) {
    console.warn(`Mutual fund quote failed for ${schemeCode}:`, error);
    return null;
  }
}

async function fetchCryptoQuotesMapped(coinIds: string[]): Promise<Map<string, MarketQuote>> {
  const result = new Map<string, MarketQuote>();
  const missing: string[] = [];

  for (const coinId of coinIds) {
    const key = cryptoQuoteKey(coinId);
    const cached = getCached<MarketQuote>(`quote:${key}`);
    if (cached) {
      result.set(key, cached);
    } else {
      missing.push(coinId);
    }
  }

  if (missing.length === 0) return result;

  try {
    const quotes = await getCryptoQuotes(missing);
    for (const quote of quotes) {
      const key = cryptoQuoteKey(quote.coinId);
      const meta = getCryptoCoin(quote.coinId);
      const mapped: MarketQuote = {
        symbol: quote.symbol || meta?.symbol || quote.coinId,
        name: quote.name || meta?.name || quote.coinId,
        exchange: "US",
        currency: quote.currency || "INR",
        currentPrice: quote.price,
        previousClose: quote.price - quote.change24h,
        dayChange: quote.change24h,
        dayChangePercent: quote.changePercent24h,
        fiftyTwoWeekHigh: quote.price,
        fiftyTwoWeekLow: quote.price,
        volume: 0,
        marketCap: quote.marketCap,
        lastUpdated: quote.lastUpdated,
      };
      setCache(`quote:${key}`, mapped);
      result.set(key, mapped);
    }
  } catch (error) {
    console.warn("Crypto batch quote failed:", error);
  }

  return result;
}

/** Fetch quotes for arbitrary market keys (stock tickers, MF:*, CRYPTO:*). */
export async function fetchQuotes(marketSymbols: string[]): Promise<Map<string, MarketQuote>> {
  const unique = [...new Set(marketSymbols.filter(Boolean))];
  const quotes = new Map<string, MarketQuote>();

  const stockKeys: string[] = [];
  const mfKeys: { key: string; code: string }[] = [];
  const cryptoIds: string[] = [];

  for (const key of unique) {
    if (isCryptoKey(key)) {
      const coinId = parseCryptoCoinId(key);
      if (coinId) cryptoIds.push(coinId);
      continue;
    }
    if (isMfKey(key)) {
      const code = parseMfSchemeCode(key);
      if (code) mfKeys.push({ key: key.startsWith("MF:") ? key : mfQuoteKey(code), code });
      continue;
    }
    stockKeys.push(key);
  }

  await Promise.all([
    ...stockKeys.map(async (marketSymbol) => {
      const mapped = await fetchStockQuoteMapped(marketSymbol);
      if (mapped) quotes.set(marketSymbol, mapped);
    }),
    ...mfKeys.map(async ({ key, code }) => {
      const mapped = await fetchMfQuoteMapped(code, key);
      if (mapped) quotes.set(key, mapped);
    }),
    (async () => {
      const cryptoMap = await fetchCryptoQuotesMapped(cryptoIds);
      for (const [key, quote] of cryptoMap) {
        quotes.set(key, quote);
      }
    })(),
  ]);

  return quotes;
}

/** Partition holdings by instrument type and fetch live quotes from the right provider. */
export async function fetchQuotesForHoldings(
  holdings: Holding[]
): Promise<Map<string, MarketQuote>> {
  const keys = holdings.map((h) => {
    if (h.instrumentType === "mutual_fund") {
      return h.yahooSymbol?.startsWith("MF:")
        ? h.yahooSymbol
        : mfQuoteKey(h.symbol);
    }
    if (h.instrumentType === "crypto") {
      return h.yahooSymbol?.startsWith("CRYPTO:")
        ? h.yahooSymbol
        : cryptoQuoteKey(h.symbol);
    }
    return h.yahooSymbol || h.symbol;
  });

  const quotes = await fetchQuotes(keys);

  // Also index by each holding's yahooSymbol so enrichHolding lookups succeed
  const byHoldingKey = new Map<string, MarketQuote>();
  for (const h of holdings) {
    const lookupKey =
      h.instrumentType === "mutual_fund"
        ? h.yahooSymbol?.startsWith("MF:")
          ? h.yahooSymbol
          : mfQuoteKey(h.symbol)
        : h.instrumentType === "crypto"
          ? h.yahooSymbol?.startsWith("CRYPTO:")
            ? h.yahooSymbol
            : cryptoQuoteKey(h.symbol)
          : h.yahooSymbol || h.symbol;

    const quote = quotes.get(lookupKey);
    if (quote) {
      byHoldingKey.set(lookupKey, quote);
      if (h.yahooSymbol && h.yahooSymbol !== lookupKey) {
        byHoldingKey.set(h.yahooSymbol, quote);
      }
    }
  }

  return byHoldingKey;
}

export async function fetchQuote(marketSymbol: string): Promise<MarketQuote> {
  const quotes = await fetchQuotes([marketSymbol]);
  const quote = quotes.get(marketSymbol);
  if (!quote) throw new Error(`No quote data for ${marketSymbol}`);
  return quote;
}

export const MARKET_DATA_STALE_TIME = REFRESH_MS;
export const MARKET_DATA_REFETCH_INTERVAL = REFRESH_MS;
export const SEARCH_MIN_QUERY_LENGTH = SEARCH_MIN_LENGTH;
