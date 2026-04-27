import { useMemo, useState } from "react";
import { useExpenses } from "../hooks/useExpenses";
import { groupByCategory, groupByMonth } from "../utils/analytics";
import { groupByDay } from "../utils/groupByDay";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, PieChart, Activity, Info } from "lucide-react";

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
import PageHeader from "../components/layout/PageHeader";

type AnalyticsTab = "overview" | "distribution" | "trends";

export default function AnalyticsPage() {
  const { expenses, loading } = useExpenses();
  const { accounts } = useAccounts();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");

  const months = useMemo(() => {
    return Array.from(new Set(expenses.map((expense) => expense.month)))
      .sort()
      .reverse();
  }, [expenses]);

  const [userSelectedMonth] = useState<string | null>(null);
  const selectedMonth = userSelectedMonth ?? months[0] ?? "";

  const filteredExpenses = useMemo(() => {
    if (!selectedMonth) return [];
    return expenses.filter((expense) => expense.month === selectedMonth);
  }, [expenses, selectedMonth]);

  const tabs = [
    { id: "overview", label: "Overview", icon: <Info size={16} /> },
    { id: "distribution", label: "Distribution", icon: <PieChart size={16} /> },
    { id: "trends", label: "Trends", icon: <Activity size={16} /> },
  ];

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto min-h-[100dvh] max-w-6xl px-4 pb-32 pt-24 md:px-6"
    >
      <PageHeader 
        title="Analytics" 
        subtitle="Visual insights and spending performance."
        icon={<BarChart3 size={24} />}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <AnimatePresence mode="wait">
        <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
        >
            {activeTab === "overview" && (
                <section className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 p-8 shadow-sm transition-all">
                    <h2 className="mb-8 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                        Operational Intelligence
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
            )}

            {activeTab === "distribution" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <section className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 p-10 shadow-sm transition-all">
                        <h2 className="mb-10 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 text-center">
                            Category Distribution
                        </h2>
                        <div className="space-y-10">
                            <div className="flex h-64 items-center justify-center">
                                <CategoryPie data={groupByCategory(filteredExpenses)} />
                            </div>
                            <div className="h-px bg-slate-100 dark:bg-white/5" />
                            <CategoryBars expenses={filteredExpenses} />
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 p-10 shadow-sm transition-all">
                        <h2 className="mb-10 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 text-center">
                            Account Allocation
                        </h2>
                        <AccountSpendingBars expenses={filteredExpenses} accounts={accounts} />
                    </section>
                </div>
            )}

            {activeTab === "trends" && (
                <div className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <section className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 p-8 shadow-sm transition-all">
                            <h3 className="mb-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                Capital Outflow
                            </h3>
                            <MonthlyBar data={groupByMonth(expenses)} />
                        </section>

                        <section className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 p-8 shadow-sm transition-all">
                            <h3 className="mb-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                Velocity Analysis
                            </h3>
                            <TrendLine data={groupByMonth(expenses)} />
                        </section>
                    </div>

                    <section className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 p-8 shadow-sm transition-all">
                        <h3 className="mb-8 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                            Daily Pulse Metrics
                        </h3>
                        <div className="h-64">
                            {loading ? <Skeleton className="w-full h-full" /> : <DailyTrend data={groupByDay(filteredExpenses)} />}
                        </div>
                    </section>
                </div>
            )}
        </motion.div>
      </AnimatePresence>
    </motion.main>
  );
}
