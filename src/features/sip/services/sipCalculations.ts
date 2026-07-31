import { computeWeightedAverage } from "../../portfolio/services/portfolioCalculations";
import type {
  SipPlan,
  SipPortfolioSummary,
  VirtualPosition,
  VirtualPositionWithMetrics,
} from "../types";

export { computeWeightedAverage };

export function positionMetrics(
  position: VirtualPosition,
  currentPrice?: number
): VirtualPositionWithMetrics {
  const hasLiveQuote = currentPrice != null && currentPrice > 0;
  const price = hasLiveQuote ? currentPrice! : position.averageBuyPrice;
  const currentValue = position.totalUnits * price;
  const profit = currentValue - position.totalInvested;
  const profitPercent = position.totalInvested > 0 ? (profit / position.totalInvested) * 100 : 0;
  return {
    ...position,
    currentPrice: price,
    currentValue,
    profit,
    profitPercent,
    hasLiveQuote,
  };
}

export function summarizeSipPlans(
  plans: SipPlan[],
  positions: VirtualPositionWithMetrics[]
): SipPortfolioSummary {
  const activeCount = plans.filter((p) => p.status === "active").length;
  const pausedCount = plans.filter((p) => p.status === "paused").length;
  const completedCount = plans.filter((p) => p.status === "completed").length;
  const totalInvested = positions.reduce((s, p) => s + p.totalInvested, 0);
  const currentValue = positions.reduce((s, p) => s + p.currentValue, 0);
  const profit = currentValue - totalInvested;
  const profitPercent = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
  return {
    activeCount,
    pausedCount,
    completedCount,
    totalInvested,
    currentValue,
    profit,
    profitPercent,
  };
}

export function bestAndWorst(positions: VirtualPositionWithMetrics[]) {
  if (positions.length === 0) return { best: null, worst: null };
  const sorted = [...positions].sort((a, b) => b.profitPercent - a.profitPercent);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}

export function allocationByAssetType(positions: VirtualPositionWithMetrics[]) {
  const map = new Map<string, number>();
  let total = 0;
  for (const p of positions) {
    map.set(p.assetType, (map.get(p.assetType) ?? 0) + p.currentValue);
    total += p.currentValue;
  }
  return [...map.entries()].map(([name, value]) => ({
    name,
    value,
    percent: total > 0 ? (value / total) * 100 : 0,
  }));
}

export function allocationBySymbol(positions: VirtualPositionWithMetrics[]) {
  const total = positions.reduce((s, p) => s + p.currentValue, 0);
  return positions.map((p) => ({
    name: p.assetName || p.symbol,
    value: p.currentValue,
    percent: total > 0 ? (p.currentValue / total) * 100 : 0,
  }));
}

export function monthlyInvestmentSeries(
  transactions: { date: string; investmentAmount: number; status: string }[]
) {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.status !== "executed") continue;
    const month = t.date.slice(0, 7);
    map.set(month, (map.get(month) ?? 0) + t.investmentAmount);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));
}

export function investedVsValueSeries(
  transactions: {
    date: string;
    investmentAmount: number;
    unitsPurchased: number;
    marketPrice: number;
    status: string;
  }[]
) {
  let invested = 0;
  let units = 0;
  const points: { date: string; invested: number; value: number }[] = [];
  const sorted = [...transactions]
    .filter((t) => t.status === "executed")
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const t of sorted) {
    invested += t.investmentAmount;
    units += t.unitsPurchased;
    points.push({
      date: t.date,
      invested,
      value: units * t.marketPrice,
    });
  }
  return points;
}

export function virtualPositionDocId(quoteKey: string): string {
  return quoteKey.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 700);
}
