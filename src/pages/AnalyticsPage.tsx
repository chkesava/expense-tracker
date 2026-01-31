import { useMemo, useState } from "react";
import { useExpenses } from "../hooks/useExpenses";
import { groupByCategory, groupByMonth } from "../utils/analytics";

import CategoryPie from "../components/charts/CategoryPie";
import MonthlyBar from "../components/charts/MonthlyBar";
import TrendLine from "../components/charts/TrendLine";
import MonthSelector from "../components/MonthSelector";

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
      <header className="app-header">
        <div className="app-title">Analytics</div>
      </header>

      <main className="app-container">
        {/* Month selector */}
        <MonthSelector
          months={months}
          value={selectedMonth}
          onChange={setUserSelectedMonth}
        />

        {/* Category split */}
        <div className="card">
          <CategoryPie data={groupByCategory(filteredExpenses)} />
        </div>

        {/* Monthly spend (overall trend) */}
        <div className="card">
          <MonthlyBar data={groupByMonth(expenses)} />
        </div>

        {/* Trend for selected month */}
        <div className="card">
          <TrendLine data={groupByMonth(expenses)} />
        </div>
      </main>
    </>
  );
}
