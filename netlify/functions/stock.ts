import YahooFinanceModule from "yahoo-finance2";

function createYahooClient() {
  const mod: any = YahooFinanceModule;
  const TargetClass = mod?.YahooFinance || mod?.default?.YahooFinance || mod?.default || mod;
  if (typeof TargetClass === "function") {
    try {
      return new TargetClass({ suppressNotices: ["yahooSurvey"] });
    } catch {
      return new TargetClass();
    }
  }
  return TargetClass;
}

const yahooFinance = createYahooClient();

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=60",
} as const;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: JSON_HEADERS });
}

function sanitizeStockError(err: unknown, symbol: string): { message: string; status: number } {
  const raw = String((err as any)?.message || err || "").toLowerCase();
  if (raw.includes("not found") || raw.includes("no data") || raw.includes("invalid")) {
    return {
      message: `No market quote found for symbol: ${symbol}. Check the ticker and try again.`,
      status: 404,
    };
  }
  if (raw.includes("timeout") || raw.includes("timed out") || raw.includes("abort")) {
    return {
      message: "Stock quote request timed out. Please try again.",
      status: 504,
    };
  }
  return {
    message: "Unable to fetch stock quote right now. Please try again later.",
    status: 502,
  };
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const rawSymbol = url.searchParams.get("symbol");

  if (!rawSymbol || !rawSymbol.trim()) {
    return json(
      { success: false, message: "Query parameter 'symbol' is required" },
      400
    );
  }

  let symbol = rawSymbol.trim().toUpperCase();
  // Auto-append .NS for Indian symbols if no suffix is supplied (e.g. SILVERBEES -> SILVERBEES.NS)
  if (!symbol.includes(".") && !["AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "QQQ", "SPY"].includes(symbol)) {
    symbol = `${symbol}.NS`;
  }

  try {
    const quote: any = await yahooFinance.quote(symbol);

    if (!quote || typeof quote.regularMarketPrice !== "number") {
      return json(
        { success: false, message: `No market quote found for symbol: ${symbol}` },
        404
      );
    }

    const price = quote.regularMarketPrice ?? quote.postMarketPrice ?? quote.preMarketPrice ?? 0;
    const previousClose = quote.regularMarketPreviousClose ?? price;
    const change = quote.regularMarketChange ?? (price - previousClose);
    const changePercent = quote.regularMarketChangePercent ?? (previousClose > 0 ? (change / previousClose) * 100 : 0);

    return json({
      symbol: quote.symbol || symbol,
      name: quote.longName || quote.shortName || symbol,
      price,
      currency: quote.currency || "INR",
      change,
      changePercent,
      previousClose,
      dayHigh: quote.regularMarketDayHigh ?? price,
      dayLow: quote.regularMarketDayLow ?? price,
      marketTime: quote.regularMarketTime ? new Date(quote.regularMarketTime).toISOString() : new Date().toISOString(),
      exchange: quote.exchange || "NSE",
      success: true,
    });
  } catch (err: unknown) {
    console.error(`Yahoo Finance error for ${symbol}:`, (err as any)?.message || err);
    const { message, status } = sanitizeStockError(err, symbol);
    return json({ success: false, message }, status);
  }
};
