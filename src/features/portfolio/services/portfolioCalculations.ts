import type {
  AllocationSlice,
  Holding,
  HoldingWithMetrics,
  MarketQuote,
  PortfolioSettings,
  PortfolioSummary,
  PortfolioTransaction,
} from "../types";

const ALLOCATION_COLORS = [
  "#00D09C",
  "#5367FF",
  "#FF6B6B",
  "#FFB020",
  "#9B59B6",
  "#3498DB",
  "#E74C3C",
  "#1ABC9C",
];

export function computeWeightedAverage(
  currentQty: number,
  currentAvg: number,
  buyQty: number,
  buyPrice: number
): number {
  const totalQty = currentQty + buyQty;
  if (totalQty <= 0) return 0;
  return (currentQty * currentAvg + buyQty * buyPrice) / totalQty;
}

export function enrichHolding(holding: Holding, quote?: MarketQuote): HoldingWithMetrics {
  const hasLiveQuote = quote != null && quote.currentPrice > 0;
  const currentPrice = hasLiveQuote ? quote.currentPrice : holding.averageBuyPrice;
  const investedValue = holding.quantity * holding.averageBuyPrice;
  const currentValue = holding.quantity * currentPrice;
  const profit = currentValue - investedValue;
  const profitPercent = investedValue > 0 ? (profit / investedValue) * 100 : 0;

  return {
    ...holding,
    currentPrice,
    investedValue,
    currentValue,
    profit,
    profitPercent,
    dayChange: quote?.dayChange ?? 0,
    dayChangePercent: quote?.dayChangePercent ?? 0,
    sector: quote?.sector ?? holding.sector,
    hasLiveQuote,
  };
}

export function computePortfolioSummary(
  holdings: HoldingWithMetrics[],
  settings: PortfolioSettings | null
): PortfolioSummary {
  const portfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalInvested = holdings.reduce((sum, h) => sum + h.investedValue, 0);
  const overallGainLoss = portfolioValue - totalInvested;

  const todayGainLoss = holdings.reduce(
    (sum, h) => sum + h.quantity * h.dayChange,
    0
  );
  const previousValue = portfolioValue - todayGainLoss;
  const todayGainLossPercent =
    previousValue > 0 ? (todayGainLoss / previousValue) * 100 : 0;

  const sorted = [...holdings].sort((a, b) => b.profitPercent - a.profitPercent);

  return {
    portfolioValue,
    todayGainLoss,
    todayGainLossPercent,
    overallGainLoss,
    overallGainLossPercent: totalInvested > 0 ? (overallGainLoss / totalInvested) * 100 : 0,
    totalInvested,
    totalHoldings: holdings.length,
    cashBalance: settings?.cashBalance ?? 0,
    topGainer: sorted[0] ?? null,
    topLoser: sorted[sorted.length - 1] ?? null,
  };
}

export function computeAllocation(
  holdings: HoldingWithMetrics[],
  key: "instrumentType" | "sector" | "symbol"
): AllocationSlice[] {
  const totals = new Map<string, number>();
  let total = 0;

  for (const h of holdings) {
    const label =
      key === "instrumentType"
        ? h.instrumentType
        : key === "sector"
          ? h.sector ?? "Unknown"
          : h.symbol;
    totals.set(label, (totals.get(label) ?? 0) + h.currentValue);
    total += h.currentValue;
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1).replace("_", " "),
      value: total > 0 ? (value / total) * 100 : 0,
      color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
    }));
}

export function computeRealizedProfit(
  transactions: PortfolioTransaction[],
  symbol: string
): number {
  const symbolTxns = transactions
    .filter((t) => t.symbol === symbol && t.orderStatus === "executed")
    .sort((a, b) => a.date.localeCompare(b.date));

  let realized = 0;
  let costBasis = 0;
  let qty = 0;

  for (const txn of symbolTxns) {
    if (txn.type === "BUY" || txn.type === "BONUS") {
      const totalCost = txn.quantity * txn.price + txn.fees;
      costBasis += totalCost;
      qty += txn.quantity;
    } else if (txn.type === "SELL") {
      const avgCost = qty > 0 ? costBasis / qty : 0;
      const sellProceeds = txn.quantity * txn.price - txn.fees;
      realized += sellProceeds - avgCost * txn.quantity;
      costBasis -= avgCost * txn.quantity;
      qty -= txn.quantity;
    }
  }

  return realized;
}

export function filterHoldingsByType(
  holdings: HoldingWithMetrics[],
  type: "stock" | "etf" | "mutual_fund" | "gold" | "crypto"
): HoldingWithMetrics[] {
  return holdings.filter((h) => h.instrumentType === type);
}

export function getPortfolioAssetValue(holdings: HoldingWithMetrics[]): number {
  return holdings.reduce((sum, h) => sum + h.currentValue, 0);
}
