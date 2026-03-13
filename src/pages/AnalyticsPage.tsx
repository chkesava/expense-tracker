import { useMemo, useState } from "react";
import { useExpenses } from "../hooks/useExpenses";
import { groupByCategory, groupByMonth } from "../utils/analytics";
import { groupByDay } from "../utils/groupByDay";
import { motion } from "framer-motion";

import CategoryPie from "../components/charts/CategoryPie";
import MonthlyBar from "../components/charts/MonthlyBar";
import TrendLine from "../components/charts/TrendLine";
import DailyTrend from "../components/charts/DailyTrend";

import MonthSelector from "../components/MonthSelector";
import SmartSummary from "../components/analytics/SmartSummary";
import CategoryBars from "../components/analytics/CategoryBars";
import MonthlyComparison from "../components/analytics/MonthlyComparison";
import WeeklySummary from "../components/analytics/WeeklySummary";

export default function AnalyticsPage() {
  const expenses = useExpenses();

  const months = useMemo(() => {
    return Array.from(new Set(expenses.map((e) => e.month))).sort().reverse();
  }, [expenses]);

  const [userSelectedMonth, setUserSelectedMonth] = useState<string | null>(null);
  const selectedMonth = userSelectedMonth ?? months[0] ?? "";

  const filteredExpenses = useMemo(() => {
    if (!selectedMonth) return [];
    return expenses.filter((e) => e.month === selectedMonth);
  }, [expenses, selectedMonth]);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="max-w-4xl mx-auto pt-20 md:pt-24 pb-28 px-4 md:px-6 min-h-screen bg-page-gradient"
    >
      <MonthSelector months={months} value={selectedMonth} onChange={setUserSelectedMonth} />

      <div className="space-y-6">
        <section className="bg-card-gradient border border-border rounded-xl p-6 shadow-card">
          <h2 className="text-sm font-medium text-foreground mb-5">Performance summary</h2>
          <div className="space-y-6">
            <SmartSummary expenses={filteredExpenses} />
            <div className="h-px bg-border" />
            <MonthlyComparison expenses={expenses} />
            <div className="h-px bg-border" />
            <WeeklySummary expenses={expenses} month={selectedMonth} />
          </div>
        </section>

        <section className="bg-card-gradient border border-border rounded-xl p-6 shadow-card">
          <h2 className="text-sm font-medium text-foreground mb-5">Spending by category</h2>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="h-64 flex items-center justify-center">
              <CategoryPie data={groupByCategory(filteredExpenses)} />
            </div>
            <div>
              <CategoryBars expenses={filteredExpenses} />
            </div>
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-card-gradient border border-border rounded-xl p-6 shadow-card">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Total spending trend</h3>
            <MonthlyBar data={groupByMonth(expenses)} />
          </section>
          <section className="bg-card-gradient border border-border rounded-xl p-6 shadow-card">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Spending velocity</h3>
            <TrendLine data={groupByMonth(expenses)} />
          </section>
        </div>

        <section className="bg-card-gradient border border-border rounded-xl p-6 shadow-card">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Daily activity</h3>
          <div className="h-64">
            <DailyTrend data={groupByDay(filteredExpenses)} />
          </div>
        </section>
      </div>
    </motion.main>
  );
}
