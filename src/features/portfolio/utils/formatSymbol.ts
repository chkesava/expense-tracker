import type { Exchange, InstrumentType } from "../types";

const ETF_KEYWORDS = ["BEES", "ETF", "NIFTY", "SENSEX", "GOLD", "SILVER"];

export function toMarketSymbol(symbol: string, exchange: Exchange): string {
  const clean = symbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, "");
  if (exchange === "US") return clean;
  const suffix = exchange === "BSE" ? ".BO" : ".NS";
  return `${clean}${suffix}`;
}

export function inferInstrumentType(symbol: string, name: string): InstrumentType {
  const upper = `${symbol} ${name}`.toUpperCase();
  if (ETF_KEYWORDS.some((kw) => upper.includes(kw))) return "etf";
  return "stock";
}

export function parseMarketExchange(symbol: string): Exchange {
  const normalized = symbol.toUpperCase();
  if (normalized.endsWith(".BO")) return "BSE";
  if (normalized.endsWith(".NS")) return "NSE";
  return "US";
}

export function stripMarketSuffix(symbol: string): string {
  return symbol.replace(/\.(NS|BO)$/i, "").toUpperCase();
}
