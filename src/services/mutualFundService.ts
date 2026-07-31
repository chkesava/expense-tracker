import type { MutualFundQuoteDTO, MutualFundSearchResult } from "../types/market";

export type { MutualFundQuoteDTO, MutualFundSearchResult };

interface MutualFundSearchResponse {
  success: boolean;
  results?: MutualFundSearchResult[];
  message?: string;
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const errorData = await res.json().catch(() => ({} as { message?: string }));
  return errorData.message || fallback;
}

export async function getMutualFund(schemeCode: string): Promise<MutualFundQuoteDTO> {
  const trimmed = schemeCode.trim();
  if (!trimmed) {
    throw new Error("Scheme code is required");
  }
  if (!/^\d+$/.test(trimmed)) {
    throw new Error("Invalid scheme code. Use the numeric AMFI scheme code.");
  }

  const endpoint = `/.netlify/functions/mutualFunds?schemeCode=${encodeURIComponent(trimmed)}`;
  let res: Response;
  try {
    res = await fetch(endpoint);
  } catch {
    throw new Error("Network error while fetching mutual fund data. Check your connection.");
  }

  if (!res.ok) {
    throw new Error(
      await parseError(res, `Failed to fetch mutual fund NAV for scheme ${trimmed} (${res.status})`)
    );
  }

  const data: MutualFundQuoteDTO = await res.json();
  if (!data.success) {
    throw new Error(data.message || `Failed to fetch mutual fund NAV for scheme ${trimmed}`);
  }
  return data;
}

export async function searchMutualFunds(query: string): Promise<MutualFundSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const endpoint = `/.netlify/functions/mutualFunds?q=${encodeURIComponent(trimmed)}`;
  let res: Response;
  try {
    res = await fetch(endpoint);
  } catch {
    throw new Error("Network error while searching mutual funds. Check your connection.");
  }

  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to search mutual funds"));
  }

  const data: MutualFundSearchResponse | MutualFundQuoteDTO = await res.json();

  // Numeric search may return a single quote
  if ("schemeCode" in data && "nav" in data && data.success) {
    return [{ schemeCode: data.schemeCode, schemeName: data.schemeName }];
  }

  const search = data as MutualFundSearchResponse;
  if (!search.success) {
    throw new Error(search.message || "Failed to search mutual funds");
  }
  return search.results ?? [];
}
