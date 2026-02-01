import { useMemo, useState } from "react";
import { useExpenses } from "../hooks/useExpenses";
import { groupByCategory, groupByMonth } from "../utils/analytics";

import CategoryPie from "../components/charts/CategoryPie";
import MonthlyBar from "../components/charts/MonthlyBar";
import TrendLine from "../components/charts/TrendLine";
import MonthSelector from "../components/MonthSelector";
import DailyTrend from "../components/charts/DailyTrend";
import { groupByDay } from "../utils/groupByDay";
import SmartSummary from "../components/analytics/SmartSummary";
import CategoryBars from "../components/analytics/CategoryBars";
import MonthlyComparison from "../components/analytics/MonthlyComparison";
import WeeklySummary from "../components/analytics/WeeklySummary";
import Collapsible from "../components/common/Collapsible";

export default function AnalyticsPage() {
  const expenses = useExpenses();

  /* -------------------------
   * Available months
   * ------------------------- */
  const months = useMemo(() => {
    return Array.from(new Set(expenses.map(e => e.month)))
      .sort()
      .reverse();
  }, [expenses]);

  /* -------------------------
   * Selected month (derived)
   * ------------------------- */
  const [userSelectedMonth, setUserSelectedMonth] = useState<string | null>(null);
  const selectedMonth = userSelectedMonth ?? months[0] ?? "";

  /* -------------------------
   * Filtered expenses
   * ------------------------- */
  const filteredExpenses = useMemo(() => {
    if (!selectedMonth) return [];
    return expenses.filter(e => e.month === selectedMonth);
  }, [expenses, selectedMonth]);
  return (
    <>
      <main className="app-container">
        {/* Month selector */}
        <MonthSelector
          months={months}
          value={selectedMonth}
          onChange={setUserSelectedMonth}
        />
        {/* Summary (smart summary + monthly comparison) */}
        <Collapsible title="Summary" defaultOpen>
          <SmartSummary expenses={filteredExpenses} />
          <div style={{ height: 10 }} />
          <MonthlyComparison expenses={expenses} />
          <div style={{ height: 10 }} />
          <WeeklySummary expenses={expenses} month={selectedMonth} />
        </Collapsible>

        {/* Category section (pie + bars) */}
        <Collapsible title="Category breakdown" defaultOpen>
          <div className="card">
            <CategoryPie data={groupByCategory(filteredExpenses)} />
          </div>
          <div style={{ height: 10 }} />
          <CategoryBars expenses={filteredExpenses} />
        </Collapsible>

        {/* Trends */}
        <Collapsible title="Monthly trends">
          <div className="card">
            <MonthlyBar data={groupByMonth(expenses)} />
          </div>

          <div style={{ height: 10 }} />

          <div className="card">
            <TrendLine data={groupByMonth(expenses)} />
          </div>
        </Collapsible>

        {/* Daily trend */}
        <Collapsible title="Daily trend">
          <div className="card">
            <DailyTrend data={groupByDay(filteredExpenses)} />
          </div>
        </Collapsible>
      </main>
    </>
  );
}
