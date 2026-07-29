import { describe, expect, it, vi } from "vitest";
import {
  createStockApi,
  TwelveDataConfigurationError,
} from "./stockApi";

describe("stockApi", () => {
  it("maps a Twelve Data quote to the standard quote shape", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        symbol: "AAPL",
        name: "Apple Inc",
        currency: "USD",
        close: "214.1",
        change: "2.1",
        percent_change: "0.99",
        previous_close: "212",
        timestamp: 1_700_000_000,
      }),
    });
    const api = createStockApi({ baseUrl: "https://proxy.test/api", fetchImpl });

    await expect(api.getQuote(" aapl ")).resolves.toMatchObject({
      ticker: "AAPL",
      price: 214.1,
      previousClose: 212,
      change: 2.1,
      changePercent: 0.99,
      currency: "USD",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://proxy.test/api/quote?symbol=AAPL",
      expect.any(Object)
    );
  });

  it("retries a rate-limited request with backoff", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ close: 100, previous_close: 99 }),
      });
    const sleep = vi.fn().mockResolvedValue(undefined);
    const api = createStockApi({
      baseUrl: "https://proxy.test/api",
      fetchImpl,
      retries: 1,
      sleep,
    });

    await expect(api.getQuote("MSFT")).resolves.toMatchObject({ price: 100 });
    expect(sleep).toHaveBeenCalledWith(600);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("explains when the proxy has no Twelve Data token", async () => {
    const api = createStockApi({
      fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }),
      retries: 0,
    });

    await expect(api.getQuote("AAPL")).rejects.toBeInstanceOf(TwelveDataConfigurationError);
  });
});
