import type { InvestmentProvider } from "./types";
import { SimulationProvider } from "./simulationProvider";

let cached: InvestmentProvider | null = null;

/** Swap this factory later for Groww / Kite / Upstox adapters. */
export function getInvestmentProvider(): InvestmentProvider {
  if (!cached) cached = new SimulationProvider();
  return cached;
}

export type { InvestmentProvider, PriceRequest } from "./types";
export { SimulationProvider } from "./simulationProvider";
