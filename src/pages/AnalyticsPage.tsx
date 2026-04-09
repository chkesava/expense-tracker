import { useMemo, useState } from "react";
import { useExpenses } from "../hooks/useExpenses";
import { groupByCategory, groupByMonth } from "../utils/analytics";
import { groupByDay } from "../utils/groupByDay";
import { motion } from "framer-motion";

import CategoryPie from "../components/charts/CategoryPie";
import MonthlyBar from "../components/charts/MonthlyBar";
import TrendLine from "../components/charts/TrendLine";
import DailyTrend from "../components/charts/DailyTrend";

import SmartSummary from "../components/analytics/SmartSummary";
import CategoryBars from "../components/analytics/CategoryBars";
import MonthlyComparison from "../components/analytics/MonthlyComparison";
import WeeklySummary from "../components/analytics/WeeklySummary";
import AccountSpendingBars from "../components/analytics/AccountSpendingBars";
import { useAccounts } from "../hooks/useAccounts";
import { Skeleton } from "../components/common/Skeleton";

export default function AnalyticsPage() {
  const { expenses, loading } = useExpenses();
  const { accounts } = useAccounts();

  const months = useMemo(() => {
    return Array.from(new Set(expenses.map((expense) => expense.month)))
      .sort()
      .reverse();
  }, [expenses]);

  const [userSelectedMonth] = useState<string | null>(null);
  const selectedMonth = userSelectedMonth ?? months[0] ?? "";

  const filteredExpenses = useMemo(() => {
    if (!selectedMonth) {
      return [];
    }

    return expenses.filter((expense) => expense.month === selectedMonth);
  }, [expenses, selectedMonth]);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto min-h-screen max-w-6xl px-4 pb-20 pt-24 md:px-6"
    >
      <div className="space-y-6">
        <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
            <span className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
              📈
            </span>
            Performance Summary
          </h2>
          <div className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <>
                <SmartSummary expenses={filteredExpenses} />
                <div className="h-px bg-slate-100 dark:bg-slate-800" />
                <MonthlyComparison expenses={expenses} />
                <div className="h-px bg-slate-100 dark:bg-slate-800" />
                <WeeklySummary expenses={expenses} month={selectedMonth} />
              </>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-12">
            <div>
              <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
                <span className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
                  🍩
                </span>
                Spending Breakdown
              </h2>
              <div className="grid items-center gap-8">
                <div className="flex h-64 items-center justify-center">
                  <CategoryPie data={groupByCategory(filteredExpenses)} />
                </div>
                <div>
                  <CategoryBars expenses={filteredExpenses} />
                </div>
              </div>
            </div>

            <div className="h-px md:h-auto md:w-px bg-slate-100 dark:bg-slate-800/50 hidden md:block" />

            <div className="md:border-l md:border-slate-100 dark:md:border-slate-800 md:pl-12">
              <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
                <span className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                  🏦
                </span>
                Account Spending
              </h2>
              <AccountSpendingBars expenses={filteredExpenses} accounts={accounts} />
            </div>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Spending Trend
            </h3>
            <MonthlyBar data={groupByMonth(expenses)} />
          </section>

          <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Spending Velocity
            </h3>
            <TrendLine data={groupByMonth(expenses)} />
          </section>
        </div>

        <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Daily Activity
          </h3>
          <div className="h-64">
            {loading ? <Skeleton className="w-full h-full" /> : <DailyTrend data={groupByDay(filteredExpenses)} />}
          </div>
        </section>
      </div>
    </motion.main>
  );
}
