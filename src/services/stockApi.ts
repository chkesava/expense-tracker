import { getStock } from "./stockService";

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
    super("Rate limit reached. Try again in a moment.");
    this.name = "TwelveDataRateLimitError";
  }
}

export class TwelveDataConfigurationError extends Error {
  constructor() {
    super("Market quote API configuration error.");
    this.name = "TwelveDataConfigurationError";
  }
}

/**
 * Clean Yahoo Finance client adapter for legacy stockApi callers.
 */
export async function getQuote(ticker: string): Promise<StockQuote> {
  const data = await getStock(ticker);
  return {
    ticker: data.symbol,
    price: data.price,
    name: data.name,
    currency: data.currency,
    previousClose: data.previousClose,
    change: data.change,
    changePercent: data.changePercent,
    lastUpdated: data.marketTime,
  };
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const quote = await getStock(trimmed);
    return [
      {
        ticker: quote.symbol,
        name: quote.name,
        type: "Stock",
      },
    ];
  } catch {
    return [];
  }
}

export function createStockApi(_options?: any) {
  return { getQuote, searchStocks };
}

const stockApi = createStockApi();
export default stockApi;
