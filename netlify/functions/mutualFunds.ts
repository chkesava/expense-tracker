import { ipv4Fetch } from "./_ipv4";

const MFAPI_BASE = "https://api.mfapi.in";
const FETCH_TIMEOUT_MS = 20_000;
const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=60",
} as const;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: JSON_HEADERS });
}

function friendlyError(status: number, fallback: string): string {
  if (status === 404) return "Mutual fund scheme not found. Check the scheme code and try again.";
  if (status === 408 || status === 504) return "Mutual fund data request timed out. Please try again.";
  if (status >= 500) return "Mutual fund data is temporarily unavailable. Please try again later.";
  return fallback;
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

function parseNav(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function fetchLatestQuote(schemeCode: string) {
  const latestRes = await fetchWithTimeout(`${MFAPI_BASE}/mf/${encodeURIComponent(schemeCode)}/latest`);
  if (latestRes.ok) {
    const payload: any = await latestRes.json();
    if (payload?.status === "SUCCESS" || payload?.meta || payload?.data) {
      return payload;
    }
  }

  const histRes = await fetchWithTimeout(`${MFAPI_BASE}/mf/${encodeURIComponent(schemeCode)}`);
  if (!histRes.ok) {
    const status = histRes.status === 404 ? 404 : 502;
    throw Object.assign(new Error(friendlyError(status, "Failed to fetch mutual fund NAV")), { status });
  }

  const hist: any = await histRes.json();
  if (!hist || (!hist.meta && !Array.isArray(hist.data))) {
    throw Object.assign(new Error("Empty response from mutual fund provider"), { status: 502 });
  }
  return hist;
}

function normalizeQuote(schemeCode: string, payload: any) {
  const meta = payload?.meta ?? {};
  const rows: any[] = Array.isArray(payload?.data) ? payload.data : [];
  const latest = rows[0];
  const previous = rows[1];

  const nav = parseNav(latest?.nav);
  if (nav == null) {
    throw Object.assign(new Error("No NAV data available for this scheme code"), { status: 404 });
  }

  const previousNav = parseNav(previous?.nav);
  const change = previousNav != null ? nav - previousNav : 0;
  const changePercent =
    previousNav != null && previousNav > 0 ? (change / previousNav) * 100 : 0;

  return {
    schemeCode: String(meta.scheme_code ?? schemeCode),
    schemeName: meta.scheme_name || `Scheme ${schemeCode}`,
    fundHouse: meta.fund_house || "",
    nav,
    previousNav,
    change,
    changePercent,
    date: latest?.date || new Date().toISOString().slice(0, 10),
    currency: "INR",
    success: true as const,
  };
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const schemeCodeParam = url.searchParams.get("schemeCode")?.trim();
  const q = url.searchParams.get("q")?.trim();

  if (!schemeCodeParam && !q) {
    return json(
      { success: false, message: "Query parameter 'schemeCode' or 'q' is required" },
      400
    );
  }

  try {
    if (q && !schemeCodeParam) {
      // Numeric query → treat as scheme code quote
      if (/^\d+$/.test(q)) {
        const payload = await fetchLatestQuote(q);
        return json(normalizeQuote(q, payload));
      }

      const searchRes = await fetchWithTimeout(
        `${MFAPI_BASE}/mf/search?q=${encodeURIComponent(q)}`
      );
      if (!searchRes.ok) {
        return json(
          {
            success: false,
            message: friendlyError(searchRes.status, "Failed to search mutual funds"),
          },
          searchRes.status >= 500 ? 502 : 400
        );
      }

      const results: any = await searchRes.json();
      const list = Array.isArray(results) ? results : [];
      return json({
        success: true,
        results: list.slice(0, 20).map((item: any) => ({
          schemeCode: String(item.schemeCode ?? item.scheme_code ?? ""),
          schemeName: String(item.schemeName ?? item.scheme_name ?? ""),
        })).filter((item: { schemeCode: string }) => item.schemeCode),
      });
    }

    const schemeCode = schemeCodeParam!;
    if (!/^\d+$/.test(schemeCode)) {
      return json(
        { success: false, message: "Invalid scheme code. Use the numeric AMFI scheme code." },
        400
      );
    }

    const payload = await fetchLatestQuote(schemeCode);
    return json(normalizeQuote(schemeCode, payload));
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return json(
        { success: false, message: "Mutual fund data request timed out. Please try again." },
        504
      );
    }
    console.error("mutualFunds function error:", err?.message || err);
    const status = typeof err?.status === "number" ? err.status : 500;
    return json(
      {
        success: false,
        message:
          status === 404
            ? "Mutual fund scheme not found. Check the scheme code and try again."
            : "Unable to fetch mutual fund data right now. Please try again later.",
      },
      status === 404 ? 404 : 502
    );
  }
};
