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
  const rawSymbols = url.searchParams.get("symbols");
  const period1 = url.searchParams.get("period1"); // YYYY-MM-DD
  const period2 = url.searchParams.get("period2"); // YYYY-MM-DD

  if (!rawSymbols || !rawSymbols.trim()) {
    return Response.json(
      { success: false, message: "Query parameter 'symbols' is required" },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const symbolsList = rawSymbols.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

  if (symbolsList.length === 0) {
    return Response.json(
      { success: false, message: "No valid symbols provided" },
      { status: 400 }
    );
  }

  // Set default period to 1 year ago if not provided
  const queryOptions: any = { interval: '1d' };
  
  if (period1) {
    queryOptions.period1 = period1;
  } else {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    queryOptions.period1 = oneYearAgo.toISOString().split("T")[0];
  }

  if (period2) {
    queryOptions.period2 = period2;
  } else {
     queryOptions.period2 = new Date().toISOString().split("T")[0];
  }

  try {
    const results: Record<string, any[]> = {};

    // Fetch historically in parallel (up to 15 concurrent)
    const chunkSize = 15;
    for (let i = 0; i < symbolsList.length; i += chunkSize) {
      const chunk = symbolsList.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (symbol) => {
          let querySymbol = symbol;
          if (!querySymbol.includes(".") && !["AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "QQQ", "SPY"].includes(querySymbol)) {
            querySymbol = `${querySymbol}.NS`;
          }
          
          try {
            const hist = await yahooFinance.historical(querySymbol, queryOptions);
            results[symbol] = hist;
          } catch (e: any) {
            console.warn(`Failed to fetch history for ${querySymbol}: ${e.message}`);
            results[symbol] = [];
          }
        })
      );
    }

    return Response.json(
      { success: true, data: results },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600", // Cache for 1 hour since historical data doesn't change rapidly
        },
      }
    );
  } catch (err: any) {
    console.error(`Yahoo Finance historical error:`, err?.message || err);
    return Response.json(
      { success: false, message: err?.message || `Failed to fetch historical data` },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
