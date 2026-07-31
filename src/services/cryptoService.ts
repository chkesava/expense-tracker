import type { CryptoQuoteDTO } from "../types/market";

export type { CryptoQuoteDTO };

interface CryptoQuotesResponse {
  success: boolean;
  quotes?: CryptoQuoteDTO[];
  message?: string;
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const errorData = await res.json().catch(() => ({} as { message?: string }));
  return errorData.message || fallback;
}

export async function getCryptoQuotes(coinIds: string[]): Promise<CryptoQuoteDTO[]> {
  const ids = [...new Set(coinIds.map((id) => id.trim().toLowerCase()).filter(Boolean))];
  if (ids.length === 0) {
    throw new Error("At least one crypto coin id is required");
  }

  const endpoint = `/.netlify/functions/crypto?ids=${encodeURIComponent(ids.join(","))}`;
  let res: Response;
  try {
    res = await fetch(endpoint);
  } catch {
    throw new Error("Network error while fetching crypto prices. Check your connection.");
  }

  if (!res.ok) {
    throw new Error(await parseError(res, `Failed to fetch crypto prices (${res.status})`));
  }

  const data: CryptoQuotesResponse = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Failed to fetch crypto prices");
  }
  return data.quotes ?? [];
}

export async function getCrypto(coinId: string): Promise<CryptoQuoteDTO> {
  const trimmed = coinId.trim().toLowerCase();
  if (!trimmed) {
    throw new Error("Crypto coin id is required");
  }

  const quotes = await getCryptoQuotes([trimmed]);
  const quote = quotes.find((q) => q.coinId === trimmed);
  if (!quote) {
    throw new Error(`Invalid crypto id: ${trimmed}. Use a CoinGecko id such as bitcoin.`);
  }
  return quote;
}
