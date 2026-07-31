import { ipv4Fetch } from "./_ipv4";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const FETCH_TIMEOUT_MS = 20_000;
const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=60",
} as const;

/** Curated coins — easy to extend. */
const COIN_META: Record<string, { name: string; symbol: string }> = {
  bitcoin: { name: "Bitcoin", symbol: "BTC" },
  ethereum: { name: "Ethereum", symbol: "ETH" },
  solana: { name: "Solana", symbol: "SOL" },
  ripple: { name: "XRP", symbol: "XRP" },
  binancecoin: { name: "BNB", symbol: "BNB" },
  dogecoin: { name: "Dogecoin", symbol: "DOGE" },
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: JSON_HEADERS });
}

async function fetchWithTimeout(url: string, attempt = 1): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await ipv4Fetch(url, { signal: controller.signal });
  } catch (err) {
    if (attempt < 2) {
      return fetchWithTimeout(url, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeIds(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(",")
        .map((id) => id.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids")?.trim();
  const listOnly = url.searchParams.get("list") === "1";

  if (listOnly) {
    return json({
      success: true,
      coins: Object.entries(COIN_META).map(([coinId, meta]) => ({
        coinId,
        name: meta.name,
        symbol: meta.symbol,
      })),
    });
  }

  if (!idsParam) {
    return json(
      { success: false, message: "Query parameter 'ids' is required (comma-separated coin ids)" },
      400
    );
  }

  const ids = normalizeIds(idsParam);
  if (ids.length === 0) {
    return json({ success: false, message: "At least one coin id is required" }, 400);
  }

  const unknown = ids.filter((id) => !COIN_META[id]);
  // Allow unknown ids through CoinGecko (extensible), but warn via empty if all fail

  try {
    const endpoint =
      `${COINGECKO_BASE}/simple/price?ids=${encodeURIComponent(ids.join(","))}` +
      `&vs_currencies=inr` +
      `&include_market_cap=true` +
      `&include_24hr_change=true` +
      `&include_last_updated_at=true`;

    const res = await fetchWithTimeout(endpoint);

    if (!res.ok) {
      if (res.status === 429) {
        return json(
          { success: false, message: "Crypto price service is rate-limited. Please try again shortly." },
          429
        );
      }
      return json(
        { success: false, message: "Crypto price service is temporarily unavailable. Please try again later." },
        502
      );
    }

    const payload: Record<string, any> = await res.json();
    if (!payload || typeof payload !== "object") {
      return json({ success: false, message: "Empty response from crypto price service" }, 502);
    }

    const quotes = ids
      .map((coinId) => {
        const row = payload[coinId];
        if (!row || typeof row.inr !== "number") return null;

        const meta = COIN_META[coinId] ?? {
          name: coinId,
          symbol: coinId.slice(0, 4).toUpperCase(),
        };
        const changePercent24h = typeof row.inr_24h_change === "number" ? row.inr_24h_change : 0;
        const price = row.inr;
        const change24h = price * (changePercent24h / 100);

        return {
          coinId,
          name: meta.name,
          symbol: meta.symbol,
          price,
          change24h,
          changePercent24h,
          marketCap: typeof row.inr_market_cap === "number" ? row.inr_market_cap : 0,
          currency: "INR",
          lastUpdated:
            typeof row.last_updated_at === "number"
              ? new Date(row.last_updated_at * 1000).toISOString()
              : new Date().toISOString(),
          success: true as const,
        };
      })
      .filter(Boolean);

    if (quotes.length === 0) {
      return json(
        {
          success: false,
          message:
            unknown.length === ids.length
              ? "Invalid crypto id. Use a supported CoinGecko coin id (e.g. bitcoin)."
              : "No crypto prices found for the requested ids.",
        },
        404
      );
    }

    return json({ success: true, quotes });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return json(
        { success: false, message: "Crypto price request timed out. Please try again." },
        504
      );
    }
    console.error("crypto function error:", err?.message || err);
    return json(
      { success: false, message: "Unable to fetch crypto prices right now. Please try again later." },
      502
    );
  }
};
