import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { motion, type Variants, Reorder, AnimatePresence } from "framer-motion";
import { GripVertical, LayoutPanelLeft, Check, Sparkles, ArrowRight, Zap, BarChart3, Target, History as HistoryIcon, LayoutGrid, Search, ChevronRight } from "lucide-react";
import { toast } from "react-toastify";
import GamificationCard from "../components/GamificationCard";
import FocusWidget from "../components/focus/FocusWidget";
import FocusConfigModal from "../components/focus/FocusConfigModal";
import { Skeleton } from "../components/common/Skeleton";
import { useExpenses } from "../hooks/useExpenses";
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

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } },
};

const surfaceClass = "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl shadow-sm transition-colors";
const softSurfaceClass = "bg-slate-50/70 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 transition-colors";

export default function Dashboard() {
  const { expenses, loading } = useExpenses();
  const { accounts } = useAccounts();
  const { subscriptions } = useSubscriptions();
  const { budgets } = useCategoryBudgets();
  const { goals } = useFinancialGoals();
  const { user } = useAuth();
  const { settings, setDashboardOrder } = useSettings();
  const navigate = useNavigate();

  const CATEGORY_DEFS = [
    { id: "pulse", label: "Pulse", icon: Zap, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
    { id: "snap", label: "Snapshot", icon: BarChart3, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
    { id: "plan", label: "Planning", icon: Target, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    { id: "log", label: "History", icon: HistoryIcon, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-700/20" },
  ] as const;

  type CategoryId = (typeof CATEGORY_DEFS)[number]["id"];
  const [activeCategory, setActiveCategory] = useState<CategoryId | "all">("snap");

  const CATEGORY_WIDGETS: Record<CategoryId, string[]> = {
    pulse: ["magicChat", "audit", "quickAdd", "focus"],
    snap: ["overview", "topCategories", "insight", "analysisLab"],
    plan: ["budgetAlerts", "financialGoals", "subscriptions", "gamification"],
    log: ["recentActivity"],
  };

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
    const current = byMonth.find((m) => m.month === selectedMonth)?.value ?? 0;
    const idx = byMonth.findIndex((m) => m.month === selectedMonth);
    const prev = idx >= 0 && byMonth[idx + 1] ? byMonth[idx + 1].value : 0;
    const change = prev === 0 ? 0 : Math.round(((current - prev) / prev) * 100);
    return { current, prev, change };
  }, [expenses, selectedMonth]);

  const summary = useMemo(() => ({
    total: monthlyComparison.current,
    byCategory: Object.fromEntries(topCategories.map(c => [c.category, c.value]))
  }), [monthlyComparison.current, topCategories]);

  const smartInsight = useMemo(() => getSmartInsight(filteredExpenses, settings.monthlyBudget, selectedMonth), [filteredExpenses, settings.monthlyBudget, selectedMonth]);
  const budgetUsagePercent = settings.monthlyBudget > 0 ? Math.min(100, Math.round((monthlyComparison.current / settings.monthlyBudget) * 100)) : 0;
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
        className="group relative cursor-pointer overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 p-1 shadow-xl shadow-blue-500/20"
      >
        <div className="relative z-10 flex h-full items-center justify-between rounded-[2.3rem] bg-white/10 p-6 backdrop-blur-xl dark:bg-slate-900/10 transition-colors group-hover:bg-white/5 dark:group-hover:bg-slate-950/5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white shadow-inner backdrop-blur-md">
              <Search size={24} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Deep Analysis</h3>
              <p className="text-xs font-bold text-blue-100/70 uppercase tracking-widest">Custom Ranges • Advanced Filters</p>
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-transform group-hover:translate-x-1">
            <ChevronRight size={20} />
          </div>
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl transition-transform group-hover:scale-150" />
      </motion.div>
    ),
    audit: auditableCount > 0 && (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative group p-6 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-xl shadow-indigo-500/20 overflow-hidden cursor-pointer active:scale-[0.98] transition-all h-full"
        onClick={() => navigate("/expenses", { state: { tab: "audit" } })}
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <Sparkles size={80} />
        </div>
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-widest">Needs Audit</span>
            </div>
            <h2 className="text-xl font-bold mb-1 leading-tight">Clean Up Expenses</h2>
            <p className="text-indigo-100 text-[10px] font-medium opacity-80">{auditableCount} items to categorize</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md self-end">
            <ArrowRight size={20} />
          </div>
        </div>
      </motion.div>
    ),
    focus: showFocus && <FocusWidget onOpenConfig={() => setShowFocusConfig(true)} />,
    gamification: showGamification && <GamificationCard />,
    subscriptions: showSubscriptions && (
      <Link to="/subscriptions" className="block relative group">
        <section className={`${surfaceClass} p-4 cursor-pointer flex items-center justify-between relative overflow-hidden h-full`}>
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300">S</div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Subscriptions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subscriptions.filter((s) => s.isActive).length} active</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-950/70 flex items-center justify-center text-slate-400 dark:text-slate-300 relative z-10">Go</div>
        </section>
      </Link>
    ),
    topCategories: showTopCategories && (
      <section className={`${surfaceClass} p-6 h-full`}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">T</span>
          Top Categories
        </h3>
        <div className="space-y-3">
          {topCategories.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8 italic">No expense data yet</p>
          ) : (
            topCategories.map((item, index) => (
              <div key={item.category} className={`p-3 rounded-xl ${softSurfaceClass}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-slate-900 text-xs font-bold text-slate-500 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-800">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.category}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">₹{item.value.toLocaleString()}</div>
                </div>
                {settings.monthlyBudget > 0 && (
                  <div className="h-1.5 w-full bg-slate-200/50 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full opacity-80", getUsageColor((item.value / settings.monthlyBudget) * 100).split(" ")[0])}
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
      <div className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85 h-full">
        {loading ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-10 w-32" />
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Overview</h3>
              <span className="text-[10px] font-black bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                {selectedMonth}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">₹{summary.total.toLocaleString()}</span>
              <span className="text-sm font-bold text-slate-400">total spent</span>
            </div>
            <div className="space-y-4">
              {Object.entries(summary.byCategory).slice(0, 3).map(([cat, amt]) => (
                <div key={cat} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-300 uppercase tracking-widest">{cat}</span>
                    <span className="text-slate-900 dark:text-white">₹{amt.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${summary.total > 0 ? (amt / summary.total) * 100 : 0}%` }} 
                      className="h-full bg-blue-600 rounded-full" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
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
              {category} • ₹100
            </button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <button className="flex-1 py-2 bg-slate-50 dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors" onClick={() => quickAddDirect("Food", 50)} disabled={isAdding}>₹50</button>
          <button className="flex-1 py-2 bg-slate-50 dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors" onClick={() => quickAddDirect("Transport", 100)} disabled={isAdding}>₹100</button>
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
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">₹{budget.spent.toLocaleString()} of ₹{budget.amount.toLocaleString()}</div>
                  </div>
                  <div className={cn("text-xs font-extrabold uppercase tracking-[0.2em]", budget.level === "danger" ? "text-red-600 dark:text-red-300" : "text-amber-600 dark:text-amber-300")}>
                    {budget.percent}%
                  </div>
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
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">₹{goal.currentAmount.toLocaleString()} of ₹{goal.targetAmount.toLocaleString()}</div>
                  </div>
                  <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">{goal.progress}%</div>
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
      <div className="rounded-3xl border border-white/40 bg-white/60 p-8 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/80 h-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recent Activity</h3>
          <button onClick={() => navigate("/expenses")} className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline px-2 py-1">View All</button>
        </div>

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-10 w-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))
          ) : filteredExpenses.length === 0 ? (
            <div className="py-12 text-center opacity-40 italic text-sm">No expenses this month</div>
          ) : (
            filteredExpenses.slice(0, visibleCount).map((expense) => (
              <div 
                key={expense.id} 
                className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-white/40 dark:border-slate-700/50 group hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold group-hover:scale-110 transition-transform">
                    {expense.category[0]}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white mb-0.5">{expense.category}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{expense.date}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-slate-900 dark:text-white">-₹{expense.amount}</div>
                  {accounts.find(a => a.id === expense.accountId) && (
                    <div className="text-[9px] font-bold text-blue-500 dark:text-blue-400 uppercase">{accounts.find(a => a.id === expense.accountId)?.name}</div>
                  )}
                </div>
              </div>
            ))
          )}
          {filteredExpenses.length > visibleCount && !loading && (
            <button onClick={() => setVisibleCount(v => v + 5)} className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">Load More</button>
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

    if (isReordering || activeCategory === "all") return sortedKnown;

    const categoryWidgets = CATEGORY_WIDGETS[activeCategory];
    return sortedKnown.filter(id => categoryWidgets.includes(id));
  }, [settings.dashboardOrder, isReordering, activeCategory]);

  return (
    <>
      <FocusConfigModal isOpen={showFocusConfig} onClose={() => setShowFocusConfig(false)} />

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="min-h-[100dvh] max-w-7xl mx-auto px-4 md:px-8 pt-20 md:pt-24 pb-32">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <LayoutPanelLeft size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Manage your personal finances</p>
            </div>
          </div>
          <button
            onClick={() => setIsReordering(!isReordering)}
            className={cn(
              "w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95",
              isReordering 
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
            )}
          >
            {isReordering ? (
              <>
                <Check size={16} />
                <span>Done</span>
              </>
            ) : (
              <span>Rearrange</span>
            )}
          </button>
        </div>

        <div className="md:flex md:items-start md:gap-8 min-h-[600px]">
          {/* Desktop Dashboard Sidebar */}
          {!isReordering && (
            <aside className="hidden md:block sticky top-24 z-10 w-20 shrink-0 lg:w-64 self-start">
              <div className={cn(surfaceClass, "p-3 shadow-sm flex flex-col gap-1")}>
                {CATEGORY_DEFS.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-3 py-3 transition-all",
                        isActive 
                          ? "bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900 scale-[1.02]" 
                          : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400"
                      )}
                    >
                      <cat.icon className={cn("h-5 w-5 shrink-0", isActive ? cat.color : "opacity-70")} />
                      <div className="hidden lg:block text-sm font-black tracking-tight">{cat.label}</div>
                      <div className="hidden lg:block ml-auto">
                        <div className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-current" : "bg-transparent")} />
                      </div>
                    </button>
                  );
                })}
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-1" />
                <button
                  onClick={() => setIsReordering(true)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all"
                >
                  <LayoutGrid className="h-5 w-5 shrink-0" />
                  <div className="hidden lg:block text-sm font-black tracking-tight">Rearrange</div>
                </button>
              </div>
            </aside>
          )}

          <div className="flex-1 min-w-0">
            {/* Mobile Category Switcher (Top Segmented Control) */}
            {!isReordering && (
              <div className="md:hidden mb-10 overflow-hidden">
                <div className="bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-[2rem] flex items-center relative border border-slate-200/50 dark:border-slate-800/50">
                  {CATEGORY_DEFS.map((cat) => {
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={cn(
                          "relative z-10 flex flex-col items-center justify-center gap-1 flex-1 py-3 transition-colors",
                          isActive ? "text-slate-900 dark:text-white" : "text-slate-500"
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeCategoryPill"
                            className="absolute inset-0 bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-sm z-[-1]"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                        <cat.icon size={18} className={cn(isActive && cat.color)} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contextual Header */}
            {!isReordering && (
              <div className="mb-8 px-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCategory}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex flex-col gap-1"
                  >
                    <div className="flex items-center gap-2">
                       <h2 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white capitalize">
                        {activeCategory === "all" ? "Manage Layout" : CATEGORY_DEFS.find(c => c.id === activeCategory)?.label}
                      </h2>
                      {activeCategory !== "all" && (
                        <div className={cn("px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest", CATEGORY_DEFS.find(c => c.id === activeCategory)?.bg, CATEGORY_DEFS.find(c => c.id === activeCategory)?.color)}>
                          {CATEGORY_WIDGETS[activeCategory as CategoryId].length} Items
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {activeCategory === "pulse" && "Ready to take action on your finances."}
                      {activeCategory === "snap" && "Your financial landscape at a glance."}
                      {activeCategory === "plan" && "Tracking goals and future commitments."}
                      {activeCategory === "log" && "A record of your recent spending activity."}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}

            <Reorder.Group
              axis="y"
              values={currentOrder}
              onReorder={setDashboardOrder}
              className={cn(
                "grid gap-6 transition-all duration-500",
                isReordering ? "grid-cols-1 max-w-2xl mx-auto" : "md:grid-cols-2 lg:grid-cols-2"
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
                        !isReordering && (id === "overview" || id === "recentActivity" || id === "magicChat") && "md:col-span-2"
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
        </div>
      </motion.div>
    </>
  );
}
