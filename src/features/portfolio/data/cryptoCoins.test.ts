import { describe, expect, it } from "vitest";
import { CRYPTO_COINS, getCryptoCoin, searchCryptoCoins } from "./cryptoCoins";

describe("cryptoCoins registry", () => {
  it("includes the six curated coins", () => {
    expect(CRYPTO_COINS.map((c) => c.coinId)).toEqual(
      expect.arrayContaining([
        "bitcoin",
        "ethereum",
        "solana",
        "ripple",
        "binancecoin",
        "dogecoin",
      ])
    );
  });

  it("looks up by coin id", () => {
    expect(getCryptoCoin("bitcoin")?.symbol).toBe("BTC");
    expect(getCryptoCoin("UNKNOWN")).toBeUndefined();
  });

  it("searches by name or symbol", () => {
    expect(searchCryptoCoins("eth").some((c) => c.coinId === "ethereum")).toBe(true);
    expect(searchCryptoCoins("BTC").some((c) => c.coinId === "bitcoin")).toBe(true);
    expect(searchCryptoCoins("")).toHaveLength(CRYPTO_COINS.length);
  });
});
