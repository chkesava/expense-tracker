import type { PriceQuote, SipAssetType } from "../../types";

export interface PriceRequest {
  assetType: SipAssetType;
  symbol: string;
  quoteKey: string;
}

/** Provider-agnostic price source — Simulation today; brokers later. */
export interface InvestmentProvider {
  readonly id: string;
  getPrice(request: PriceRequest): Promise<PriceQuote>;
}
