export interface CryptoCoinMeta {
  coinId: string;
  name: string;
  symbol: string;
}

/** Curated CoinGecko ids — add entries here to support more coins. */
export const CRYPTO_COINS: CryptoCoinMeta[] = [
  { coinId: "bitcoin", name: "Bitcoin", symbol: "BTC" },
  { coinId: "ethereum", name: "Ethereum", symbol: "ETH" },
  { coinId: "solana", name: "Solana", symbol: "SOL" },
  { coinId: "ripple", name: "XRP", symbol: "XRP" },
  { coinId: "binancecoin", name: "BNB", symbol: "BNB" },
  { coinId: "dogecoin", name: "Dogecoin", symbol: "DOGE" },
];

const byId = new Map(CRYPTO_COINS.map((c) => [c.coinId, c]));

export function getCryptoCoin(coinId: string): CryptoCoinMeta | undefined {
  return byId.get(coinId.trim().toLowerCase());
}

export function searchCryptoCoins(query: string): CryptoCoinMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return CRYPTO_COINS;
  return CRYPTO_COINS.filter(
    (c) =>
      c.coinId.includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
  );
}
