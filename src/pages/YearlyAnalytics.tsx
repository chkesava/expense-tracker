import { useMemo, useState } from "react";
import { useExpenses } from "../hooks/useExpenses";
import { useIncomes } from "../hooks/useIncomes";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { groupByCategory } from "../utils/analytics";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie
} from "recharts";
import { chartAxisTick, chartTokens, chartTooltipStyle, getChartColor } from "../utils/chartColors";
import Amount from "../components/common/Amount";
import { Skeleton } from "../components/common/Skeleton";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface YearlyAnalyticsProps {
  year?: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function YearlyAnalytics({ year }: YearlyAnalyticsProps) {
  const { expenses, loading: expensesLoading } = useExpenses();
  const { incomes, loading: incomesLoading } = useIncomes();
  const loading = expensesLoading || incomesLoading;

  // Build list of available years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    expenses.forEach((e) => years.add(parseInt(e.month.slice(0, 4))));
    incomes.forEach((i) => years.add(parseInt(i.month.slice(0, 4))));
    const sorted = Array.from(years).sort((a, b) => b - a);
    return sorted.length > 0 ? sorted : [new Date().getFullYear()];
  }, [expenses, incomes]);

  const [selectedYear, setSelectedYear] = useState<number>(
    year ?? availableYears[0] ?? new Date().getFullYear()
  );

  // Monthly spend & income for the selected year
  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
      const spent = expenses
        .filter((e) => e.month === month)
        .reduce((s, e) => s + e.amount, 0);
      const earned = incomes
        .filter((inc) => inc.month === month)
        .reduce((s, inc) => s + inc.amount, 0);
      return { month: MONTH_LABELS[i], spent, earned, savings: earned - spent };
    });
  }, [expenses, incomes, selectedYear]);

  const yearExpenses = useMemo(
    () => expenses.filter((e) => e.month.startsWith(String(selectedYear))),
    [expenses, selectedYear]
  );
  const yearIncomes = useMemo(
    () => incomes.filter((i) => i.month.startsWith(String(selectedYear))),
    [incomes, selectedYear]
  );

  const totalSpent = useMemo(() => yearExpenses.reduce((s, e) => s + e.amount, 0), [yearExpenses]);
  const totalEarned = useMemo(() => yearIncomes.reduce((s, i) => s + i.amount, 0), [yearIncomes]);
  const totalSavings = totalEarned - totalSpent;
  const savingsRate = totalEarned > 0 ? Math.round((totalSavings / totalEarned) * 100) : 0;

  // Best and worst month
  const bestMonth = useMemo(() =>
    monthlyData.reduce((best, m) => (m.savings > best.savings ? m : best), monthlyData[0]),
    [monthlyData]);
  const worstMonth = useMemo(() =>
    monthlyData.filter(m => m.spent > 0).reduce((worst, m) => (m.spent > worst.spent ? m : worst), monthlyData[0]),
    [monthlyData]);

  // Category breakdown for the year
  const categoryData = useMemo(() => {
    const grouped = groupByCategory(yearExpenses);
    return grouped.sort((a, b) => b.value - a.value).slice(0, 8);
  }, [yearExpenses]);

  const pieData = useMemo(() =>
    categoryData.map(c => ({ name: c.category, value: c.value })),
    [categoryData]);

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  const tokens = chartTokens();
  const tip = chartTooltipStyle(tokens);
  const tick = chartAxisTick(tokens);

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {availableYears.map((y) => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={cn(
              "shrink-0 px-5 py-2.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-95",
              selectedYear === y
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400"
            )}
          >
            {y}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total Spent", value: totalSpent, color: "rose", icon: <TrendingDown size={16} /> },
          { label: "Total Earned", value: totalEarned, color: "emerald", icon: <TrendingUp size={16} /> },
          { label: "Net Savings", value: totalSavings, color: totalSavings >= 0 ? "blue" : "rose", icon: <Minus size={16} /> },
          { label: "Savings Rate", value: null, rawLabel: `${savingsRate}%`, color: savingsRate >= 20 ? "emerald" : savingsRate >= 0 ? "amber" : "rose", icon: <TrendingUp size={16} /> },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-[2rem] border border-white/60 bg-white p-5 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{kpi.label}</span>
              <span className={cn("text-slate-400", `text-${kpi.color}-500`)}>{kpi.icon}</span>
            </div>
            <div className={cn("text-2xl font-black", `text-${kpi.color}-600 dark:text-${kpi.color}-400`)}>
              {kpi.rawLabel ? kpi.rawLabel : <Amount value={kpi.value!} />}
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Income vs Spend bar chart */}
      <div className="bento-card p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Monthly breakdown</h3>
          <div className="flex items-center gap-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-destructive" />Spent</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-success" />Earned</span>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barGap={4} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tokens.border} opacity={0.5} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={tick} />
              <YAxis hide />
              <Tooltip
                contentStyle={tip}
                formatter={(v: number | undefined) => [`₹${(v ?? 0).toLocaleString()}`, ""]}
              />
              <Bar dataKey="earned" fill={tokens.success} radius={[6, 6, 0, 0]} />
              <Bar dataKey="spent" fill={tokens.destructive} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Savings trajectory */}
      <div className="bento-card p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Savings trajectory</h3>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Month by month</span>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={tokens.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={tokens.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tokens.border} opacity={0.4} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={tick} />
              <YAxis hide />
              <Tooltip
                contentStyle={tip}
                formatter={(v: number | undefined) => [`₹${(v ?? 0).toLocaleString()}`, "Savings"]}
              />
              <Area type="monotone" dataKey="savings" stroke={tokens.primary} strokeWidth={3} fillOpacity={1} fill="url(#savingsGradient)" dot={{ r: 4, fill: tokens.primary }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown + Pie */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category bars */}
        <div className="bento-card p-6">
          <h3 className="mb-6 text-sm font-semibold text-foreground">Top categories</h3>
          <div className="space-y-3">
            {categoryData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No expenses for {selectedYear}</p>
            ) : (
              categoryData.map((cat, i) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground">{cat.category}</span>
                    <Amount value={cat.value} />
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${totalSpent > 0 ? (cat.value / totalSpent) * 100 : 0}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: getChartColor(i, tokens) }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pie */}
        <div className="bento-card p-6">
          <h3 className="mb-4 text-center text-sm font-semibold text-foreground">Category share</h3>
          {pieData.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No data</p>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={getChartColor(i, tokens)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tip}
                    formatter={(v: number | undefined) => [`₹${(v ?? 0).toLocaleString()}`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Best / Worst highlights */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-success/20 bg-success/10 p-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-success">Best savings month</div>
          <div className="text-3xl font-semibold text-foreground">{bestMonth?.month ?? "—"}</div>
          <div className="mt-1 text-sm font-semibold text-success">
            <Amount value={bestMonth?.savings ?? 0} prefix={bestMonth?.savings >= 0 ? "+" : ""} />
          </div>
        </div>
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-destructive">Highest spend month</div>
          <div className="text-3xl font-semibold text-foreground">{worstMonth?.month ?? "—"}</div>
          <div className="mt-1 text-sm font-semibold text-destructive">
            <Amount value={worstMonth?.spent ?? 0} />
          </div>
        </div>
      </div>
    </div>
  );
}
