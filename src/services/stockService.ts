import type { StockQuoteDTO } from "../types/market";

/** @deprecated Prefer StockQuoteDTO from types/market — kept for existing imports */
export type YahooStockResponse = StockQuoteDTO;

export type { StockQuoteDTO };

export async function getStock(symbol: string): Promise<StockQuoteDTO> {
  const trimmed = symbol.trim();
  if (!trimmed) {
    throw new Error("Symbol is required");
  }

  const endpoint = `/.netlify/functions/stock?symbol=${encodeURIComponent(trimmed)}`;
  let res: Response;
  try {
    res = await fetch(endpoint);
  } catch {
    throw new Error("Network error while fetching stock quote. Check your connection.");
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({} as { message?: string }));
    throw new Error(errorData.message || `Failed to fetch quote for ${symbol} (${res.status})`);
  }

  const data: StockQuoteDTO = await res.json();
  if (!data.success) {
    throw new Error(data.message || `Failed to fetch quote for ${symbol}`);
  }

  return data;
}
