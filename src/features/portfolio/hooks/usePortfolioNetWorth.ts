import { useMemo } from "react";
import { useHoldings } from "./useHoldings";
import { useHoldingsWithMetrics } from "./useMarketQuotes";
import { getPortfolioAssetValue } from "../services/portfolioCalculations";

/** Portfolio market value for Net Worth integration */
export function usePortfolioNetWorth() {
  const { holdings, loading: holdingsLoading } = useHoldings();
  const { holdingsWithMetrics, quotesLoading } = useHoldingsWithMetrics(holdings);

  const portfolioValue = useMemo(
    () => getPortfolioAssetValue(holdingsWithMetrics),
    [holdingsWithMetrics]
  );

  return {
    portfolioValue,
    holdingsWithMetrics,
    loading: holdingsLoading || quotesLoading,
  };
}
