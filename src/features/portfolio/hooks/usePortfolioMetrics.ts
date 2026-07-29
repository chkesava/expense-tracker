import { useEffect, useMemo } from "react";
import { useHoldings } from "./useHoldings";
import { useHoldingsWithMetrics } from "./useMarketQuotes";
import { usePortfolioSettings } from "./usePortfolioSettings";
import { usePortfolioSnapshots } from "./usePortfolioSnapshots";
import {
  computeAllocation,
  computePortfolioSummary,
  filterHoldingsByType,
} from "../services/portfolioCalculations";
import type { InstrumentType } from "../types";

export function usePortfolioMetrics(instrumentFilter?: InstrumentType) {
  const { holdings, loading: holdingsLoading } = useHoldings();
  const { settings, loading: settingsLoading } = usePortfolioSettings();
  const { holdingsWithMetrics, quotesLoading, isRefreshing, lastUpdated } =
    useHoldingsWithMetrics(holdings);
  const { snapshots, saveDailySnapshot } = usePortfolioSnapshots();

  const filtered = useMemo(() => {
    if (!instrumentFilter) return holdingsWithMetrics;
    return filterHoldingsByType(holdingsWithMetrics, instrumentFilter);
  }, [holdingsWithMetrics, instrumentFilter]);

  const summary = useMemo(
    () => computePortfolioSummary(filtered, settings),
    [filtered, settings]
  );

  const allocation = useMemo(
    () => computeAllocation(filtered, "symbol"),
    [filtered]
  );

  const sectorAllocation = useMemo(
    () => computeAllocation(filtered, "sector"),
    [filtered]
  );

  const etfAllocation = useMemo(
    () => computeAllocation(filterHoldingsByType(filtered, "etf"), "symbol"),
    [filtered]
  );

  useEffect(() => {
    if (!settings?.onboardingComplete || filtered.length === 0) return;
    void saveDailySnapshot({
      date: "",
      portfolioValue: summary.portfolioValue,
      investedValue: summary.totalInvested,
      profit: summary.overallGainLoss,
      profitPercent: summary.overallGainLossPercent,
      netWorth: summary.portfolioValue + (settings.cashBalance ?? 0),
    });
  }, [
    summary.portfolioValue,
    summary.totalInvested,
    summary.overallGainLoss,
    summary.overallGainLossPercent,
    settings?.cashBalance,
    settings?.onboardingComplete,
    filtered.length,
    saveDailySnapshot,
  ]);

  return {
    holdings: filtered,
    allHoldings: holdingsWithMetrics,
    settings,
    summary,
    allocation,
    sectorAllocation,
    etfAllocation,
    snapshots,
    loading: holdingsLoading || settingsLoading,
    quotesLoading,
    isRefreshing,
    lastUpdated,
  };
}
