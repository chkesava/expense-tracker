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
import Collapsible from "../components/common/Collapsible";

export default function AnalyticsPage() {
  const expenses = useExpenses();

  const months = useMemo(() => {
    return Array.from(new Set(expenses.map(e => e.month)))
      .sort()
      .reverse();
  }, [expenses]);

  const [userSelectedMonth, setUserSelectedMonth] = useState<string | null>(null);
  const selectedMonth = userSelectedMonth ?? months[0] ?? "";

  const filteredExpenses = useMemo(() => {
    if (!selectedMonth) return [];
    return expenses.filter(e => e.month === selectedMonth);
  }, [expenses, selectedMonth]);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto pt-24 pb-20 px-4 md:px-6 min-h-screen"
    >
      {/* Month Selector with High Z-Index */}

      <div className="space-y-6">
        {/* Summary Details */}
        <section className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">📈</span>
            Performance Summary
          </h2>
          <div className="space-y-6">
            <SmartSummary expenses={filteredExpenses} />
            <div className="h-px bg-slate-100" />
            <MonthlyComparison expenses={expenses} />
            <div className="h-px bg-slate-100" />
            <WeeklySummary expenses={expenses} month={selectedMonth} />
          </div>
        </section>

        {/* Category Breakdown */}
        <section className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">🍩</span>
            Spending Breakdown
          </h2>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="h-64 flex items-center justify-center">
              <CategoryPie data={groupByCategory(filteredExpenses)} />
            </div>
            <div>
              <CategoryBars expenses={filteredExpenses} />
            </div>
          </div>
        </section>

        {/* Trends */}
        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Total Spending Trend</h3>
            <MonthlyBar data={groupByMonth(expenses)} />
          </section>

          <section className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Spending Velocity</h3>
            <TrendLine data={groupByMonth(expenses)} />
          </section>
        </div>

        {/* Daily Trend */}
        <section className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Daily Activity</h3>
          <div className="h-64">
            <DailyTrend data={groupByDay(filteredExpenses)} />
          </div>
        </section>
      </div>
    </motion.main>
  );
}
