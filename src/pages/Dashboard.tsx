import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { motion, type Variants, Reorder, AnimatePresence } from "framer-motion";
import { GripVertical, LayoutPanelLeft, Check, Sparkles, ArrowRight, Zap, BarChart3, Target, History as HistoryIcon, LayoutGrid, Search, ChevronRight, Repeat } from "lucide-react";
import { toast } from "react-toastify";
import GamificationCard from "../components/GamificationCard";
import FocusWidget from "../components/focus/FocusWidget";
import FocusConfigModal from "../components/focus/FocusConfigModal";
import { Skeleton } from "../components/common/Skeleton";
import { useExpenses } from "../hooks/useExpenses";
import { useIncomes } from "../hooks/useIncomes";
import { useSubscriptions } from "../hooks/useSubscriptions";
import { useCategoryBudgets } from "../hooks/useCategoryBudgets";
import { useFinancialGoals } from "../hooks/useFinancialGoals";
import { useAuth } from "../hooks/useAuth";
import { useAccounts } from "../hooks/useAccounts";
import useSettings, { DEFAULTS } from "../hooks/useSettings";
import { useModals } from "../hooks/useModals";
import { db } from "../firebase";
import { groupByCategory, groupByMonth } from "../utils/analytics";
import { getUsageColor, getSmartInsight } from "../utils/insights";
import { CATEGORIES } from "../types/expense";
import { cn } from "../lib/utils";
import MagicChatEntry from "../components/MagicChatEntry";
import NumberTicker from "../components/common/NumberTicker";
import Amount from "../components/common/Amount";
import { Badge } from "../components/common/Badge";


const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } },
};

const surfaceClass = "bento-card";
const softSurfaceClass = "bg-primary/5 dark:bg-white/5 border border-primary/10 dark:border-white/5 transition-all duration-300 rounded-2xl";

export default function Dashboard() {
  const { expenses, loading: expensesLoading } = useExpenses();
  const { incomes, loading: incomesLoading } = useIncomes();
  const loading = expensesLoading || incomesLoading;
  const { accounts } = useAccounts();
  const { subscriptions } = useSubscriptions();
  const { budgets } = useCategoryBudgets();
  const { goals } = useFinancialGoals();
  const { user } = useAuth();
  const { settings, setDashboardOrder } = useSettings();
  const navigate = useNavigate();



  const months = useMemo(() => Array.from(new Set(expenses.map((e) => e.month))).sort().reverse(), [expenses]);
  const { globalMonth } = useModals();
  const selectedMonth = globalMonth ?? months[0] ?? "";
  const filteredExpenses = useMemo(() => (!selectedMonth ? [] : expenses.filter((e) => e.month === selectedMonth)), [expenses, selectedMonth]);
  const [visibleCount, setVisibleCount] = useState(7);
  const [isAdding, setIsAdding] = useState(false);
  const [showFocusConfig, setShowFocusConfig] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const widgets = settings.dashboardWidgets;
  const showFocus = widgets?.focus !== false;
  const showGamification = widgets?.gamification !== false;
  const showSubscriptions = widgets?.subscriptions !== false;
  const showTopCategories = widgets?.topCategories !== false;

  const quickAddDirect = async (category: string, amount: number) => {
    if (!user) return toast.error("Sign in to add expenses");
    setIsAdding(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      const month = date.slice(0, 7);
      const now = new Date();
      await addDoc(collection(db, "users", user.uid, "expenses"), {
        amount: Number(amount),
        date,
        category,
        note: "",
        month,
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: serverTimestamp(),
      });
      toast.success("Expense added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add expense");
    } finally {
      setIsAdding(false);
    }
  };

  const topCategories = useMemo(() => {
    const grouped = groupByCategory(filteredExpenses);
    return grouped.sort((a, b) => b.value - a.value).slice(0, 3);
  }, [filteredExpenses]);

  const monthlyComparison = useMemo(() => {
    const byMonth = groupByMonth(expenses);
    const currentExpenses = byMonth.find((m) => m.month === selectedMonth)?.value ?? 0;
    
    const incomeByMonth = groupByMonth(incomes as any);
    const currentIncome = incomeByMonth.find((m) => m.month === selectedMonth)?.value ?? 0;

    const idx = byMonth.findIndex((m) => m.month === selectedMonth);
    const prevExpenses = idx >= 0 && byMonth[idx + 1] ? byMonth[idx + 1].value : 0;
    const change = prevExpenses === 0 ? 0 : Math.round(((currentExpenses - prevExpenses) / prevExpenses) * 100);
    
    return { 
      currentExpenses, 
      currentIncome,
      prevExpenses, 
      change,
      savings: currentIncome - currentExpenses,
      savingsRate: currentIncome > 0 ? Math.round(((currentIncome - currentExpenses) / currentIncome) * 100) : 0
    };
  }, [expenses, incomes, selectedMonth]);

  const summary = useMemo(() => ({
    totalExpenses: monthlyComparison.currentExpenses,
    totalIncome: monthlyComparison.currentIncome,
    savings: monthlyComparison.savings,
    byCategory: Object.fromEntries(topCategories.map(c => [c.category, c.value]))
  }), [monthlyComparison, topCategories]);

  const smartInsight = useMemo(() => getSmartInsight(filteredExpenses, settings.monthlyBudget, selectedMonth), [filteredExpenses, settings.monthlyBudget, selectedMonth]);
  const budgetUsagePercent = settings.monthlyBudget > 0 ? Math.min(100, Math.round((monthlyComparison.currentExpenses / settings.monthlyBudget) * 100)) : 0;
  const budgetColorClass = getUsageColor(budgetUsagePercent).split(" ")[0];

  const categoryBudgetAlerts = useMemo(() => {
    return budgets
      .filter((budget) => budget.month === selectedMonth)
      .map((budget) => {
        const spent = filteredExpenses
          .filter((expense) => expense.category === budget.category)
          .reduce((total, expense) => total + expense.amount, 0);
        const percent = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
        const level = percent >= 100 ? "danger" : percent >= 80 ? "warning" : "ok";
        return { ...budget, spent, percent, level };
      })
      .filter((budget) => budget.level !== "ok")
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 3);
  }, [budgets, filteredExpenses, selectedMonth]);

  const goalProgress = useMemo(() => {
    return goals.map((goal) => ({
      ...goal,
      progress: goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0,
    }));
  }, [goals]);

  const insightColors: Record<string, string> = {
    success: "from-blue-600 to-indigo-700 shadow-blue-500/20",
    warning: "from-amber-500 to-orange-600 shadow-orange-500/20",
    danger: "from-red-500 to-rose-600 shadow-red-500/20",
    neutral: "from-slate-600 to-slate-700 shadow-slate-500/20",
  };

  const auditableCount = useMemo(() => {
    return expenses.filter(e => {
      const needsCategory = !e.category || e.category === "Other" || e.category === "Uncategorized";
      const needsNote = !e.note || e.note.trim() === "" || e.note.toLowerCase().includes("no note");
      return (needsCategory || needsNote) && !e.isAudited;
    }).length;
  }, [expenses]);

  const widgetMap: Record<string, React.ReactNode> = {
    magicChat: <MagicChatEntry />,
    analysisLab: (
      <motion.div 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate("/analysis")}
        className="group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-900 dark:bg-white p-[1px] shadow-2xl shadow-blue-500/10"
      >
        <div className="relative z-10 flex h-full items-center justify-between rounded-[inherit] bg-slate-900 p-6 dark:bg-white transition-colors">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 dark:bg-slate-900/10 text-white dark:text-slate-900 shadow-inner">
              <Search size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white dark:text-slate-900">Analysis Lab</h3>
              <p className="text-[10px] font-black text-white/40 dark:text-slate-900/40 uppercase tracking-widest">Custom Insights • Filters</p>
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 dark:bg-slate-900/10 text-white dark:text-slate-900 transition-transform group-hover:translate-x-1">
            <ChevronRight size={18} />
          </div>
        </div>
      </motion.div>
    ),
    audit: auditableCount > 0 && (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative group p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white shadow-sm overflow-hidden cursor-pointer active:scale-[0.98] transition-all h-full"
        onClick={() => navigate("/expenses", { state: { tab: "audit" } })}
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform duration-700">
          <Sparkles size={100} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Sparkles size={16} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Cleanup Required</span>
            </div>
            <h2 className="text-xl font-bold mb-1 tracking-tight">Audit Needed</h2>
            <p className="text-slate-500 text-[11px] font-medium opacity-80">{auditableCount} items missing categories or notes</p>
          </div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mt-4">
             <span className="text-xs font-bold uppercase tracking-widest">Start Session</span>
             <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </motion.div>
    ),
    focus: showFocus && <FocusWidget onOpenConfig={() => setShowFocusConfig(true)} />,
    gamification: showGamification && <GamificationCard />,
    subscriptions: showSubscriptions && (
      <Link to="/subscriptions" className="block relative group h-full">
        <section className={`${surfaceClass} p-5 cursor-pointer flex items-center justify-between relative overflow-hidden h-full border-slate-100 dark:border-white/5`}>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-inner">
               <Repeat size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Recurring Bills</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                {subscriptions.filter((s) => s.isActive).length} Active Subscriptions
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
        </section>
      </Link>
    ),
    topCategories: showTopCategories && (
      <section className={`${surfaceClass} p-5 h-full flex flex-col`}>
        <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4 opacity-80">
          <BarChart3 size={16} className="text-indigo-500" />
          Top Categories
        </h3>
        <div className="flex-1 flex flex-col justify-between gap-2">
          {topCategories.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8 italic">No expense data yet</p>
          ) : (
            topCategories.map((item, index) => (
              <div key={item.category} className="py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 w-4">{index + 1}.</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.category}</span>
                  </div>
                  <div className="text-sm font-black text-slate-900 dark:text-white"><Amount value={item.value} /></div>
                </div>
                {settings.monthlyBudget > 0 && (
                  <div className="h-1 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full opacity-90", getUsageColor((item.value / settings.monthlyBudget) * 100).split(" ")[0])}
                      style={{ width: `${Math.min(100, (item.value / settings.monthlyBudget) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    ),
    overview: (
      <div className="bento-card p-6 h-full relative group bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-0 overflow-hidden shadow-2xl shadow-indigo-900/20">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-1000">
           <BarChart3 size={120} className="text-white" />
        </div>
        <div className="relative z-10 flex flex-col h-full justify-between">
        {loading ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24 bg-white/10" />
              <Skeleton className="h-4 w-16 bg-white/10" />
            </div>
            <Skeleton className="h-10 w-32 bg-white/10" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-full bg-white/10" />
              <Skeleton className="h-8 w-full bg-white/10" />
            </div>
          </div>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-300">Overview</h3>
                <Badge variant="ghost" className="bg-white/10 text-white border-0 py-1">
                  {selectedMonth}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Income</p>
                   <p className="text-2xl font-black text-white tracking-tight privacy-blur">₹<NumberTicker value={summary.totalIncome} /></p>
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Expenses</p>
                   <p className="text-2xl font-black text-white tracking-tight privacy-blur">₹<NumberTicker value={summary.totalExpenses} /></p>
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-8">
                 <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Savings</p>
                    <p className={cn("text-sm font-black", summary.savings >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      <Amount value={summary.savings} prefix={summary.savings >= 0 ? "+" : ""} />
                    </p>
                 </div>
                 <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${Math.max(0, Math.min(100, monthlyComparison.savingsRate))}%` }} 
                      className="h-full bg-emerald-500 rounded-full" 
                    />
                 </div>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Top Spend Categories</p>
              {Object.entries(summary.byCategory).slice(0, 2).map(([cat, amt]) => (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-300">{cat}</span>
                    <span className="text-white"><Amount value={amt} /></span>
                  </div>
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${summary.totalExpenses > 0 ? (amt / summary.totalExpenses) * 100 : 0}%` }} 
                      className="h-full bg-white/40 rounded-full" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        </div>
      </div>
    ),
    quickAdd: (
      <section className={`${surfaceClass} p-6 h-full`}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300">Q</span>
          Quick Add
        </h3>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium ml-1">Tap a preset to add instantly</div>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.slice(0, 6).map((category) => (
            <button
              key={category}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-200 transition-all active:scale-95 disabled:opacity-50 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-300 hover:border-blue-200 dark:hover:border-blue-500/20"
              onClick={() => quickAddDirect(category, 100)}
              disabled={isAdding}
            >
              {category} • <Amount value={100} />
            </button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <button className="flex-1 py-2 bg-slate-50 dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors" onClick={() => quickAddDirect("Food", 50)} disabled={isAdding}><Amount value={50} /></button>
          <button className="flex-1 py-2 bg-slate-50 dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors" onClick={() => quickAddDirect("Transport", 100)} disabled={isAdding}><Amount value={100} /></button>
          <button className="flex-1 py-2 bg-slate-50 dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors" onClick={() => quickAddDirect("Other", 200)} disabled={isAdding}>₹200</button>
        </div>
      </section>
    ),
    insight: (
      <section className={cn("text-white p-6 rounded-3xl shadow-lg bg-gradient-to-br transition-colors duration-500 h-full", insightColors[smartInsight.type])}>
        <h3 className="text-sm font-bold opacity-90 uppercase tracking-wider mb-2">Insight</h3>
        <div className="text-sm font-medium leading-relaxed opacity-95">{smartInsight.message}</div>
      </section>
    ),
    budgetAlerts: (
      <section className={`${surfaceClass} p-6 h-full`}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300">B</span>
          Budget Alerts
        </h3>
        <div className="space-y-3">
          {categoryBudgetAlerts.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No category budget alerts for this month.</p>
          ) : (
            categoryBudgetAlerts.map((budget) => (
              <div key={budget.id} className={cn("rounded-2xl border p-4", budget.level === "danger" ? "border-red-200 bg-red-50/80 dark:border-red-500/20 dark:bg-red-500/10" : "border-amber-200 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10")}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{budget.category}</div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400"><Amount value={budget.spent} /> of <Amount value={budget.amount} /></div>
                  </div>
                  <Badge variant={budget.level === "danger" ? "danger" : "warning"} className="px-2 py-0.5 text-[9px]">
                    {budget.percent}%
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    ),
    financialGoals: (
      <section className={`${surfaceClass} p-6 h-full`}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">G</span>
          Financial Goals
        </h3>
        <div className="space-y-3">
          {goalProgress.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No active financial goals yet.</p>
          ) : (
            goalProgress.slice(0, 3).map((goal) => (
              <div key={goal.id} className={`rounded-2xl p-4 ${softSurfaceClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{goal.name}</div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400"><Amount value={goal.currentAmount} /> of <Amount value={goal.targetAmount} /></div>
                  </div>
                  <Badge variant="success" className="px-2 py-0.5 text-[9px]">
                    {goal.progress}%
                  </Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${goal.progress}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    ),
    recentActivity: (
      <div className="bento-card p-6 h-full relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 flex items-center gap-2 opacity-80">
            <HistoryIcon size={16} className="text-slate-500" />
            Recent Activity
          </h3>
          <button onClick={() => navigate("/expenses")} className="text-[9px] font-black bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">View All</button>
        </div>

        <div className="flex flex-col gap-1">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))
          ) : filteredExpenses.length === 0 ? (
            <div className="py-12 text-center opacity-40 italic text-sm">No expenses this month</div>
          ) : (
            filteredExpenses.slice(0, visibleCount).map((expense) => (
              <div 
                key={expense.id} 
                className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0 group cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-xs group-hover:scale-105 transition-transform">
                    {expense.category[0]}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{expense.category}</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{expense.date}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-sm text-slate-900 dark:text-white"><Amount value={expense.amount} prefix="-₹" /></div>
                  {accounts.find(a => a.id === expense.accountId) && (
                    <div className="text-[9px] font-bold text-slate-400 uppercase">{accounts.find(a => a.id === expense.accountId)?.name}</div>
                  )}
                </div>
              </div>
            ))
          )}
          {filteredExpenses.length > visibleCount && !loading && (
            <button onClick={() => setVisibleCount(v => v + 5)} className="w-full py-3 mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors">Load More</button>
          )}
        </div>
      </div>
    ),
  };

  const currentOrder = useMemo(() => {
    const savedOrder = settings.dashboardOrder || [];
    const knownIds = [
      ...DEFAULTS.dashboardOrder,
      "magicChat",
      "audit"
    ];

    const sortedKnown = [
      ...savedOrder.filter((id) => knownIds.includes(id)),
      ...knownIds.filter((id) => !savedOrder.includes(id)),
    ];

    return sortedKnown;
  }, [settings.dashboardOrder, isReordering]);

  return (
    <>
      <FocusConfigModal isOpen={showFocusConfig} onClose={() => setShowFocusConfig(false)} />

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="min-h-[100dvh] max-w-2xl mx-auto px-4 md:px-6 pt-20 md:pt-24 pb-32">
        <div className="flex items-center justify-between mb-8 px-1">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Dashboard</h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1.5 opacity-80">{user?.displayName?.split(' ')[0] || 'Member'} • Control Center</p>
          </div>
          <button
            onClick={() => setIsReordering(!isReordering)}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 shadow-sm",
              isReordering 
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" 
                : "bg-white/80 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5 backdrop-blur-md hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
            title="Edit Layout"
          >
            {isReordering ? <Check size={18} /> : <LayoutGrid size={18} />}
          </button>
        </div>

        <div className="min-h-[600px]">


            <Reorder.Group
              axis="y"
              values={currentOrder}
              onReorder={setDashboardOrder}
              className={cn(
                "grid gap-4 sm:gap-6 transition-all duration-500",
                "grid-cols-1 md:grid-cols-2"
              )}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {currentOrder.map((id) => {
                  const component = widgetMap[id];
                  if (!component) return null;

                  return (
                    <Reorder.Item
                      key={id}
                      value={id}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      layout
                      dragListener={isReordering}
                      className={cn(
                        "relative group h-full",
                        (id === "overview" || id === "recentActivity" || id === "magicChat") && "md:col-span-2"
                      )}
                    >
                      {isReordering && (
                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 z-30 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing text-slate-400 hover:text-blue-600 transition-colors">
                          <GripVertical size={16} />
                        </div>
                      )}
                      <div className={cn(
                        "h-full transition-all duration-300",
                        isReordering && "scale-[0.98] group-hover:scale-[1.0] group-active:scale-[0.95]"
                      )}>
                        {component}
                      </div>
                    </Reorder.Item>
                  );
                })}
              </AnimatePresence>
            </Reorder.Group>
        </div>
      </motion.div>
    </>
  );
}
