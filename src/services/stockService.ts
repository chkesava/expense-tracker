export interface YahooStockResponse {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  change: number;
  changePercent: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  marketTime: string;
  exchange: string;
  success: boolean;
  message?: string;
}

export async function getStock(symbol: string): Promise<YahooStockResponse> {
  const trimmed = symbol.trim();
  if (!trimmed) {
    throw new Error("Symbol is required");
  }

  const endpoint = `/.netlify/functions/stock?symbol=${encodeURIComponent(trimmed)}`;
  const res = await fetch(endpoint);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch quote for ${symbol} (${res.status})`);
  }

  const data: YahooStockResponse = await res.json();
  if (!data.success) {
    throw new Error(data.message || `Failed to fetch quote for ${symbol}`);
  }

  return data;
}
