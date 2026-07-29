const DEFAULT_PROXY_BASE = import.meta.env.VITE_TWELVE_DATA_PROXY ?? "/api/twelve-data";

export interface StockQuote {
  ticker: string;
  price: number;
  name: string;
  currency: string;
  previousClose: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

export interface StockSearchResult {
  ticker: string;
  name: string;
  type: string;
}

export class TwelveDataRateLimitError extends Error {
  constructor() {
    super("Twelve Data rate limit reached. Try again in a moment.");
    this.name = "TwelveDataRateLimitError";
  }
}

export class TwelveDataConfigurationError extends Error {
  constructor() {
    super("Live quotes are not configured. Add TWELVE_DATA_API_KEY to the server environment.");
    this.name = "TwelveDataConfigurationError";
  }
}

interface TwelveDataQuoteResponse {
  status?: string;
  code?: number | string;
  message?: string;
  symbol?: string;
  name?: string;
  currency?: string;
  close?: string | number;
  previous_close?: string | number;
  change?: string | number;
  percent_change?: string | number;
  timestamp?: number;
}

interface TwelveDataSearchResponse {
  status?: string;
  code?: number | string;
  message?: string;
  data?: Array<{
    symbol?: string;
    instrument_name?: string;
    instrument_type?: string;
  }>;
}

export interface StockApiClientOptions {
  /** Defaults to the same-origin Twelve Data proxy. Set only for a trusted server-side caller. */
  baseUrl?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  retries?: number;
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function buildUrl(baseUrl: string, path: string, params: Record<string, string>) {
  const isAbsolute = /^https?:\/\//i.test(baseUrl);
  const base = baseUrl.replace(/\/$/, "");
  const url = new URL(`${base}/${path.replace(/^\//, "")}`, "https://expense-tracker.local");

  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return isAbsolute ? url.toString() : `${url.pathname}${url.search}`;
}

/**
 * Thin Twelve Data client. The browser defaults to `/api/twelve-data`, so the token remains
 * on the Netlify/Vite proxy instead of being bundled into the client application.
 */
export function createStockApi(options: StockApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? DEFAULT_PROXY_BASE;
  const apiKey = options.apiKey?.trim();
  const fetchImpl = options.fetchImpl ?? fetch;
  const retries = options.retries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 600;
  const sleep = options.sleep ?? defaultSleep;

  async function request<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = buildUrl(baseUrl, path, params);

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await fetchImpl(url, {
          headers: apiKey ? { Authorization: `apikey ${apiKey}` } : undefined,
        });

        if (response.status === 401 || response.status === 403) {
          throw new TwelveDataConfigurationError();
        }

        if (response.status === 429) {
          if (attempt === retries) throw new TwelveDataRateLimitError();
          await sleep(retryDelayMs * 2 ** attempt);
          continue;
        }

        if (!response.ok) {
          throw new Error(`Twelve Data request failed (${response.status})`);
        }

        const data = (await response.json()) as T & { status?: string; code?: number | string; message?: string };
        if (data.status === "error") {
          if (Number(data.code) === 401 || Number(data.code) === 403) {
            throw new TwelveDataConfigurationError();
          }
          if (Number(data.code) === 429) {
            if (attempt === retries) throw new TwelveDataRateLimitError();
            await sleep(retryDelayMs * 2 ** attempt);
            continue;
          }
          throw new Error(data.message ?? "Twelve Data returned an error");
        }

        return data;
      } catch (error) {
        if (
          error instanceof TwelveDataConfigurationError ||
          error instanceof TwelveDataRateLimitError ||
          attempt === retries
        ) {
          throw error;
        }
        await sleep(retryDelayMs * 2 ** attempt);
      }
    }

    throw new Error("Twelve Data request failed");
  }

  async function getQuote(ticker: string): Promise<StockQuote> {
    const normalizedTicker = ticker.trim().toUpperCase();
    if (!normalizedTicker) throw new Error("A ticker is required");

    const quote = await request<TwelveDataQuoteResponse>("quote", { symbol: normalizedTicker });
    const price = Number(quote.close);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Twelve Data returned no live quote for ${normalizedTicker}`);
    }

    return {
      ticker: quote.symbol ?? normalizedTicker,
      price,
      name: quote.name ?? normalizedTicker,
      currency: quote.currency ?? "USD",
      previousClose: Number(quote.previous_close) || price,
      change: Number(quote.change) || 0,
      changePercent: Number(quote.percent_change) || 0,
      lastUpdated: quote.timestamp ? new Date(quote.timestamp * 1000).toISOString() : new Date().toISOString(),
    };
  }

  async function searchStocks(query: string): Promise<StockSearchResult[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const response = await request<TwelveDataSearchResponse>("symbol_search", {
      symbol: trimmedQuery,
      outputsize: "12",
    });
    return (response.data ?? [])
      .filter((item) => item.symbol)
      .slice(0, 12)
      .map((item) => ({
        ticker: item.symbol!,
        name: item.instrument_name ?? item.symbol!,
        type: item.instrument_type ?? "Stock",
      }));
  }

  return { getQuote, searchStocks };
}

const stockApi = createStockApi();

export const getQuote = stockApi.getQuote;
export const searchStocks = stockApi.searchStocks;
