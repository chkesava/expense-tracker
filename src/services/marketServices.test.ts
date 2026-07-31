import { afterEach, describe, expect, it, vi } from "vitest";
import { getMutualFund, searchMutualFunds } from "./mutualFundService";
import { getCrypto, getCryptoQuotes } from "./cryptoService";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("mutualFundService", () => {
  it("fetches a scheme quote", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          schemeCode: "119551",
          schemeName: "Test Fund",
          fundHouse: "Test AMC",
          nav: 100.5,
          previousNav: 99,
          change: 1.5,
          changePercent: 1.515,
          date: "31-07-2026",
          currency: "INR",
        }),
      })
    );

    const quote = await getMutualFund("119551");
    expect(quote.nav).toBe(100.5);
    expect(quote.schemeCode).toBe("119551");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/.netlify/functions/mutualFunds?schemeCode=119551")
    );
  });

  it("rejects invalid scheme codes", async () => {
    await expect(getMutualFund("ABC")).rejects.toThrow(/Invalid scheme code/i);
  });

  it("searches funds by query", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          results: [{ schemeCode: "125497", schemeName: "HDFC Top 100" }],
        }),
      })
    );
    const results = await searchMutualFunds("HDFC");
    expect(results).toHaveLength(1);
    expect(results[0].schemeCode).toBe("125497");
  });
});

describe("cryptoService", () => {
  it("fetches a single coin", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          quotes: [
            {
              coinId: "bitcoin",
              name: "Bitcoin",
              symbol: "BTC",
              price: 5000000,
              change24h: 1000,
              changePercent24h: 1.2,
              marketCap: 1e12,
              currency: "INR",
              lastUpdated: "2026-07-31T10:00:00.000Z",
              success: true,
            },
          ],
        }),
      })
    );

    const quote = await getCrypto("bitcoin");
    expect(quote.price).toBe(5000000);
    expect(quote.coinId).toBe("bitcoin");
  });

  it("batches multiple coin ids", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          quotes: [
            {
              coinId: "bitcoin",
              name: "Bitcoin",
              symbol: "BTC",
              price: 1,
              change24h: 0,
              changePercent24h: 0,
              marketCap: 0,
              currency: "INR",
              lastUpdated: "2026-07-31T10:00:00.000Z",
              success: true,
            },
            {
              coinId: "ethereum",
              name: "Ethereum",
              symbol: "ETH",
              price: 2,
              change24h: 0,
              changePercent24h: 0,
              marketCap: 0,
              currency: "INR",
              lastUpdated: "2026-07-31T10:00:00.000Z",
              success: true,
            },
          ],
        }),
      })
    );

    const quotes = await getCryptoQuotes(["bitcoin", "ethereum"]);
    expect(quotes).toHaveLength(2);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("ids=bitcoin%2Cethereum")
    );
  });
});
