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
                <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
                    <h2 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
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
            )}

            {activeTab === "distribution" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <section className="rounded-[2.5rem] border border-white/60 bg-white/80 p-8 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
                        <h2 className="mb-8 text-sm font-black uppercase tracking-widest text-slate-400 text-center">
                            Category Breakdown
                        </h2>
                        <div className="space-y-8">
                            <div className="flex h-64 items-center justify-center">
                                <CategoryPie data={groupByCategory(filteredExpenses)} />
                            </div>
                            <CategoryBars expenses={filteredExpenses} />
                        </div>
                    </section>

                    <section className="rounded-[2.5rem] border border-white/60 bg-white/80 p-8 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
                        <h2 className="mb-8 text-sm font-black uppercase tracking-widest text-slate-400 text-center">
                            Account Allocation
                        </h2>
                        <AccountSpendingBars expenses={filteredExpenses} accounts={accounts} />
                    </section>
                </div>
            )}

            {activeTab === "trends" && (
                <div className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
                            <h3 className="mb-6 text-xs font-black uppercase tracking-widest text-slate-400">
                                Monthly Spend
                            </h3>
                            <MonthlyBar data={groupByMonth(expenses)} />
                        </section>

                        <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
                            <h3 className="mb-6 text-xs font-black uppercase tracking-widest text-slate-400">
                                Velocity Trend
                            </h3>
                            <TrendLine data={groupByMonth(expenses)} />
                        </section>
                    </div>

                    <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
                        <h3 className="mb-6 text-xs font-black uppercase tracking-widest text-slate-400">
                            Daily Activity Pulse
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
