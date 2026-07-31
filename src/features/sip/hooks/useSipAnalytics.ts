import { useMemo } from "react";
import {
  investedVsValueSeries,
  monthlyInvestmentSeries,
} from "../services/sipCalculations";
import type { SipTransaction, VirtualPositionWithMetrics } from "../types";

export function useSipAnalytics(
  transactions: SipTransaction[],
  positions: VirtualPositionWithMetrics[]
) {
  const monthly = useMemo(
    () => monthlyInvestmentSeries(transactions),
    [transactions]
  );

  const performance = useMemo(
    () => investedVsValueSeries(transactions),
    [transactions]
  );

  const calendarDays = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.status === "executed") set.add(t.date);
    }
    return set;
  }, [transactions]);

  return { monthly, performance, calendarDays, positions };
}
