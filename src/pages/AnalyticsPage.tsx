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
      <main className="app-container page-enter">
        {/* Month selector */}
        <MonthSelector
          months={months}
          value={selectedMonth}
          onChange={setUserSelectedMonth}
        />

        <div style={{ height: 20 }} />

        {/* Summary (smart summary + monthly comparison) */}
        <Collapsible title="Summary" defaultOpen>
          <div className="grid gap-6">
            <SmartSummary expenses={filteredExpenses} />
            <div style={{ height: 1, background: 'rgba(0,0,0,0.05)' }} />
            <MonthlyComparison expenses={expenses} />
            <div style={{ height: 1, background: 'rgba(0,0,0,0.05)' }} />
            <WeeklySummary expenses={expenses} month={selectedMonth} />
          </div>
        </Collapsible>

        {/* Category section (pie + bars) */}
        <Collapsible title="Category breakdown" defaultOpen>
          <div className="grid gap-8">
            <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CategoryPie data={groupByCategory(filteredExpenses)} />
            </div>
            <CategoryBars expenses={filteredExpenses} />
          </div>
        </Collapsible>

        {/* Trends */}
        <Collapsible title="Monthly trends">
          <div className="grid gap-8">
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#6b7280' }}>Total Spending</div>
              <MonthlyBar data={groupByMonth(expenses)} />
            </div>

            <div style={{ height: 1, background: 'rgba(0,0,0,0.05)' }} />

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#6b7280' }}>Trend Line</div>
              <TrendLine data={groupByMonth(expenses)} />
            </div>
          </div>
        </Collapsible>

        {/* Daily trend */}
        <Collapsible title="Daily trend">
          <DailyTrend data={groupByDay(filteredExpenses)} />
        </Collapsible>

        {/* Spacer for bottom nav */}
        <div style={{ height: 80 }} />
      </main>
    </>
  );
}
