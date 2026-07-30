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

export default async (req: Request) => {
  const url = new URL(req.url);
  const rawSymbol = url.searchParams.get("symbol");

  if (!rawSymbol || !rawSymbol.trim()) {
    return Response.json(
      { success: false, message: "Query parameter 'symbol' is required" },
      { status: 400, headers: { "Content-Type": "application/json" } }
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
      return Response.json(
        { success: false, message: `No market quote found for symbol: ${symbol}` },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const price = quote.regularMarketPrice ?? quote.postMarketPrice ?? quote.preMarketPrice ?? 0;
    const previousClose = quote.regularMarketPreviousClose ?? price;
    const change = quote.regularMarketChange ?? (price - previousClose);
    const changePercent = quote.regularMarketChangePercent ?? (previousClose > 0 ? (change / previousClose) * 100 : 0);

    const responsePayload = {
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
    };

    return Response.json(responsePayload, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err: any) {
    console.error(`Yahoo Finance error for ${symbol}:`, err?.message || err);
    return Response.json(
      {
        success: false,
        message: err?.message || `Failed to fetch quote for ${symbol}`,
      },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
