import { describe, expect, it } from "vitest";
import {
  allocationByAssetType,
  bestAndWorst,
  computeWeightedAverage,
  investedVsValueSeries,
  monthlyInvestmentSeries,
  positionMetrics,
  summarizeSipPlans,
  virtualPositionDocId,
} from "./sipCalculations";
import type { SipPlan, VirtualPosition } from "../types";

function makePosition(overrides: Partial<VirtualPosition> = {}): VirtualPosition {
  return {
    id: "p1",
    assetType: "stock",
    symbol: "RELIANCE",
    quoteKey: "RELIANCE.NS",
    assetName: "Reliance",
    totalUnits: 10,
    averageBuyPrice: 100,
    totalInvested: 1000,
    sipIds: ["sip1"],
    ...overrides,
  };
}

describe("computeWeightedAverage", () => {
  it("averages cost across buys", () => {
    expect(computeWeightedAverage(10, 100, 10, 200)).toBe(150);
  });
});

describe("positionMetrics", () => {
  it("uses live price when provided", () => {
    const m = positionMetrics(makePosition(), 120);
    expect(m.hasLiveQuote).toBe(true);
    expect(m.currentValue).toBe(1200);
    expect(m.profit).toBe(200);
    expect(m.profitPercent).toBeCloseTo(20, 5);
  });

  it("falls back to average buy when no live price", () => {
    const m = positionMetrics(makePosition());
    expect(m.hasLiveQuote).toBe(false);
    expect(m.currentValue).toBe(1000);
    expect(m.profit).toBe(0);
  });
});

describe("summarizeSipPlans", () => {
  it("counts statuses and aggregates P&L", () => {
    const plans = [
      { status: "active" },
      { status: "active" },
      { status: "paused" },
      { status: "completed" },
    ] as SipPlan[];
    const positions = [
      positionMetrics(makePosition({ totalInvested: 1000, totalUnits: 10 }), 120),
      positionMetrics(
        makePosition({
          id: "p2",
          symbol: "TCS",
          quoteKey: "TCS.NS",
          totalInvested: 500,
          totalUnits: 5,
          averageBuyPrice: 100,
        }),
        90
      ),
    ];
    const s = summarizeSipPlans(plans, positions);
    expect(s.activeCount).toBe(2);
    expect(s.pausedCount).toBe(1);
    expect(s.completedCount).toBe(1);
    expect(s.totalInvested).toBe(1500);
    expect(s.currentValue).toBe(1200 + 450);
    expect(s.profit).toBe(150);
  });
});

describe("bestAndWorst / allocation", () => {
  it("picks best and worst by return %", () => {
    const a = positionMetrics(makePosition({ id: "a", assetName: "A" }), 150);
    const b = positionMetrics(
      makePosition({
        id: "b",
        assetName: "B",
        symbol: "B",
        quoteKey: "B.NS",
        totalUnits: 10,
        averageBuyPrice: 100,
        totalInvested: 1000,
      }),
      50
    );
    const { best, worst } = bestAndWorst([a, b]);
    expect(best?.assetName).toBe("A");
    expect(worst?.assetName).toBe("B");
  });

  it("allocates by asset type", () => {
    const positions = [
      positionMetrics(makePosition({ assetType: "stock", totalUnits: 10, averageBuyPrice: 100, totalInvested: 1000 }), 100),
      positionMetrics(
        makePosition({
          id: "c",
          assetType: "crypto",
          symbol: "bitcoin",
          quoteKey: "CRYPTO:bitcoin",
          totalUnits: 1,
          averageBuyPrice: 500,
          totalInvested: 500,
        }),
        500
      ),
    ];
    const alloc = allocationByAssetType(positions);
    expect(alloc).toHaveLength(2);
    expect(alloc.find((a) => a.name === "stock")?.percent).toBeCloseTo(66.666, 1);
  });
});

describe("series helpers", () => {
  it("aggregates monthly investments", () => {
    const series = monthlyInvestmentSeries([
      { date: "2026-01-10", investmentAmount: 1000, status: "executed" },
      { date: "2026-01-20", investmentAmount: 500, status: "executed" },
      { date: "2026-02-10", investmentAmount: 1000, status: "executed" },
      { date: "2026-02-10", investmentAmount: 1000, status: "skipped" },
    ]);
    expect(series).toEqual([
      { month: "2026-01", amount: 1500 },
      { month: "2026-02", amount: 1000 },
    ]);
  });

  it("builds invested vs value timeline", () => {
    const points = investedVsValueSeries([
      {
        date: "2026-01-10",
        investmentAmount: 1000,
        unitsPurchased: 10,
        marketPrice: 100,
        status: "executed",
      },
      {
        date: "2026-02-10",
        investmentAmount: 1000,
        unitsPurchased: 5,
        marketPrice: 200,
        status: "executed",
      },
    ]);
    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({ invested: 1000, value: 1000 });
    expect(points[1]).toMatchObject({ invested: 2000, value: 15 * 200 });
  });
});

describe("virtualPositionDocId", () => {
  it("sanitizes quote keys for Firestore doc ids", () => {
    expect(virtualPositionDocId("CRYPTO:bitcoin")).toBe("CRYPTO_bitcoin");
    expect(virtualPositionDocId("MF:125497")).toBe("MF_125497");
  });
});
