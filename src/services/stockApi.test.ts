import { afterEach, describe, expect, it, vi } from "vitest";
import { getQuote, searchStocks } from "./stockApi";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("stockApi (Yahoo adapter)", () => {
  it("maps a Yahoo quote to the standard quote shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          symbol: "AAPL",
          name: "Apple Inc",
          currency: "USD",
          price: 214.1,
          change: 2.1,
          changePercent: 0.99,
          previousClose: 212,
          dayHigh: 215,
          dayLow: 210,
          marketTime: "2026-07-31T10:00:00.000Z",
          exchange: "NMS",
        }),
      })
    );

    await expect(getQuote(" aapl ")).resolves.toMatchObject({
      ticker: "AAPL",
      price: 214.1,
      previousClose: 212,
      change: 2.1,
      changePercent: 0.99,
      currency: "USD",
      lastUpdated: "2026-07-31T10:00:00.000Z",
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/.netlify/functions/stock?symbol=aapl")
    );
  });

  it("returns a single search hit when the symbol resolves", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          symbol: "RELIANCE.NS",
          name: "Reliance Industries",
          currency: "INR",
          price: 2800,
          change: 10,
          changePercent: 0.3,
          previousClose: 2790,
          dayHigh: 2810,
          dayLow: 2780,
          marketTime: "2026-07-31T10:00:00.000Z",
          exchange: "NSE",
        }),
      })
    );

    const results = await searchStocks("RELIANCE");
    expect(results).toEqual([
      { ticker: "RELIANCE.NS", name: "Reliance Industries", type: "Stock" },
    ]);
  });

  it("returns empty search results when quote fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ success: false, message: "Not found" }),
      })
    );

    await expect(searchStocks("NOPE")).resolves.toEqual([]);
  });
});
