import { useMemo, useState } from "react";
import { cn } from "../lib/utils";
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
import { useModals } from "../hooks/useModals";

type AnalyticsTab = "overview" | "distribution" | "trends";

export default function AnalyticsPage({ hideHeader }: { hideHeader?: boolean }) {
  const { expenses, loading } = useExpenses();
  const { accounts } = useAccounts();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");

  // ✅ FIX: Read from globalMonth context (shared with Dashboard & header drawer)
  const { globalMonth, setGlobalMonth } = useModals();

  const months = useMemo(() => {
    return Array.from(new Set(expenses.map((e) => e.month)))
      .sort()
      .reverse();
  }, [expenses]);

  const selectedMonth = globalMonth ?? months[0] ?? "";

  const filteredExpenses = useMemo(() => {
    if (!selectedMonth) return [];
    return expenses.filter((e) => e.month === selectedMonth);
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
      className={cn(
        "mx-auto min-h-[100dvh] max-w-6xl px-4 pb-32 md:px-6",
        !hideHeader && "pt-24"
      )}
    >
      {!hideHeader && (
        <PageHeader
          title="Analytics"
          subtitle="Visual insights and spending performance."
          icon={<BarChart3 size={24} />}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* Month selector strip */}
      {months.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 pt-2 mb-6 custom-scrollbar">
          {months.map((month) => {
            const isActive = month === selectedMonth;
            const label = new Date(month + "-01").toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            });
            return (
              <button
                key={month}
                onClick={() => setGlobalMonth(month)}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95",
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-blue-300"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Tab switcher when used inside InsightsHub */}
      {hideHeader && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as AnalyticsTab)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === t.id
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      )}

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
            <section className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 p-8 shadow-sm">
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
                    <MonthlyComparison expenses={expenses} selectedMonth={selectedMonth} />
                    <div className="h-px bg-slate-100 dark:bg-slate-800" />
                    <WeeklySummary expenses={expenses} month={selectedMonth} />
                  </>
                )}
              </div>
            </section>
          )}

          {activeTab === "distribution" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 p-10 shadow-sm">
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

              <section className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 p-10 shadow-sm">
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
                <section className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 p-8 shadow-sm">
                  <h3 className="mb-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Capital Outflow — All Time
                  </h3>
                  <MonthlyBar data={groupByMonth(expenses)} />
                </section>

                <section className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 p-8 shadow-sm">
                  <h3 className="mb-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Velocity Analysis — All Time
                  </h3>
                  <TrendLine data={groupByMonth(expenses)} />
                </section>
              </div>

              <section className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 p-8 shadow-sm">
                <h3 className="mb-8 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                  Daily Pulse —{" "}
                  {selectedMonth
                    ? new Date(selectedMonth + "-01").toLocaleDateString(undefined, {
                        month: "long",
                        year: "numeric",
                      })
                    : ""}
                </h3>
                <div className="h-64">
                  {loading ? (
                    <Skeleton className="w-full h-full" />
                  ) : (
                    <DailyTrend data={groupByDay(filteredExpenses)} />
                  )}
                </div>
              </section>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.main>
  );
}
