import {
  getQuote,
  searchStocks,
  TwelveDataConfigurationError,
  TwelveDataRateLimitError,
} from "../../../services/stockApi";
import type { Exchange, InstrumentType, MarketQuote, SearchResult } from "../types";
import { inferInstrumentType } from "../utils/formatSymbol";
import { searchLocalSymbols } from "../data/indianSymbols";

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

function stripLegacySuffix(symbol: string) {
  return symbol.replace(/\.(NS|BO)$/i, "").trim().toUpperCase();
}

function exchangeFromSymbol(symbol: string): Exchange {
  const normalized = symbol.toUpperCase();
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
        // Existing portfolio documents use this field name. It now stores the Twelve Data ticker.
        yahooSymbol: item.ticker,
      }))
    );
  } catch (error) {
    // Local symbols keep the form usable when offline, rate-limited, or before the proxy is configured.
    if (local.length > 0 || error instanceof TwelveDataConfigurationError) return local;
    throw error;
  }
}

export async function fetchQuote(marketSymbol: string): Promise<MarketQuote> {
  const quotes = await fetchQuotes([marketSymbol]);
  const quote = quotes.get(marketSymbol);
  if (!quote) throw new Error(`No quote data for ${marketSymbol}`);
  return quote;
}

export async function fetchQuotes(marketSymbols: string[]): Promise<Map<string, MarketQuote>> {
  const unique = [...new Set(marketSymbols.filter(Boolean))];
  const quotes = new Map<string, MarketQuote>();

  await Promise.all(
    unique.map(async (marketSymbol) => {
      const cacheKey = `quote:${marketSymbol}`;
      const cached = getCached<MarketQuote>(cacheKey);
      if (cached) {
        quotes.set(marketSymbol, cached);
        return;
      }

      try {
        const quote = await getQuote(stripLegacySuffix(marketSymbol));
        const mapped: MarketQuote = {
          symbol: stripLegacySuffix(marketSymbol),
          name: quote.name,
          exchange: exchangeFromSymbol(marketSymbol),
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
        quotes.set(marketSymbol, mapped);
      } catch (error) {
        // A bad or unsupported symbol must not prevent the rest of the portfolio from rendering.
        if (!(error instanceof TwelveDataConfigurationError)) {
          console.warn(`Twelve Data quote failed for ${marketSymbol}:`, error);
        }
      }
    })
  );

  return quotes;
}

export const MARKET_DATA_STALE_TIME = REFRESH_MS;
export const MARKET_DATA_REFETCH_INTERVAL = REFRESH_MS;
export const SEARCH_MIN_QUERY_LENGTH = SEARCH_MIN_LENGTH;
