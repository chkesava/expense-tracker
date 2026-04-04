import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { motion, type Variants } from "framer-motion";
import { toast } from "react-toastify";
import MonthSelector from "../components/MonthSelector";
import GamificationCard from "../components/GamificationCard";
import FocusWidget from "../components/focus/FocusWidget";
import FocusConfigModal from "../components/focus/FocusConfigModal";
import StoryViewer from "../components/story/StoryViewer";
import { useStoryGenerator } from "../hooks/useStoryGenerator";
import { useExpenses } from "../hooks/useExpenses";
import { useSubscriptions } from "../hooks/useSubscriptions";
import { useCategoryBudgets } from "../hooks/useCategoryBudgets";
import { useFinancialGoals } from "../hooks/useFinancialGoals";
import { useAuth } from "../hooks/useAuth";
import useSettings from "../hooks/useSettings";
import { db } from "../firebase";
import { groupByCategory, groupByMonth } from "../utils/analytics";
import { getUsageColor, getSmartInsight } from "../utils/insights";
import { CATEGORIES } from "../types/expense";
import { cn } from "../lib/utils";

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
  const expenses = useExpenses();
  const { subscriptions } = useSubscriptions();
  const { budgets } = useCategoryBudgets();
  const { goals } = useFinancialGoals();
  const { user } = useAuth();
  const { settings } = useSettings();

  const months = useMemo(() => Array.from(new Set(expenses.map((e) => e.month))).sort().reverse(), [expenses]);
  const [userSelectedMonth, setUserSelectedMonth] = useState<string | null>(null);
  const selectedMonth = userSelectedMonth ?? months[0] ?? "";
  const filteredExpenses = useMemo(() => (!selectedMonth ? [] : expenses.filter((e) => e.month === selectedMonth)), [expenses, selectedMonth]);
  const [visibleCount, setVisibleCount] = useState(7);
  const [isAdding, setIsAdding] = useState(false);
  const [showFocusConfig, setShowFocusConfig] = useState(false);
  const [showStory, setShowStory] = useState(false);

  const widgets = settings.dashboardWidgets;
  const showFocus = widgets?.focus !== false;
  const showGamification = widgets?.gamification !== false;
  const showSubscriptions = widgets?.subscriptions !== false;
  const showTopCategories = widgets?.topCategories !== false;
  const showLeftColumn = showFocus || showGamification || showSubscriptions || showTopCategories;

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

  const smartInsight = useMemo(() => getSmartInsight(filteredExpenses, settings.monthlyBudget, selectedMonth), [filteredExpenses, settings.monthlyBudget, selectedMonth]);
  const budgetUsagePercent = settings.monthlyBudget > 0 ? Math.min(100, Math.round((monthlyComparison.current / settings.monthlyBudget) * 100)) : 0;
  const budgetColorClass = getUsageColor(budgetUsagePercent).split(" ")[0];
  const storySlides = useStoryGenerator(filteredExpenses, selectedMonth);

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

  return (
    <>
      <StoryViewer isOpen={showStory} onClose={() => setShowStory(false)} slides={storySlides} />
      <MonthSelector months={months} value={selectedMonth} onChange={setUserSelectedMonth} />
      <FocusConfigModal isOpen={showFocusConfig} onClose={() => setShowFocusConfig(false)} />

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="min-h-screen max-w-7xl mx-auto px-4 md:px-8 pt-20 md:pt-24 pb-32">
        <div className={cn("grid gap-6", showLeftColumn ? "md:grid-cols-3" : "md:grid-cols-2 max-w-5xl mx-auto")}>
          {showLeftColumn && (
            <div className="space-y-6">
              {showFocus && (
                <motion.div variants={itemVariants}>
                  <FocusWidget onOpenConfig={() => setShowFocusConfig(true)} />
                </motion.div>
              )}

              {showGamification && (
                <motion.div variants={itemVariants}>
                  <GamificationCard />
                </motion.div>
              )}

              {showSubscriptions && (
                <Link to="/subscriptions" className="block relative group">
                  <motion.section variants={itemVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`${surfaceClass} p-4 cursor-pointer flex items-center justify-between relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300">S</div>
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Subscriptions</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subscriptions.filter((s) => s.isActive).length} active</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-950/70 flex items-center justify-center text-slate-400 dark:text-slate-300 relative z-10">Go</div>
                  </motion.section>
                </Link>
              )}

              {showTopCategories && (
                <motion.section variants={itemVariants} className={`${surfaceClass} p-6`}>
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
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">₹{item.value.toLocaleString()}</div>
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
                </motion.section>
              )}
            </div>
          )}

          <div className="space-y-6">
            <motion.section variants={itemVariants} className={`${surfaceClass} p-6`}>
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">This Month</h3>
              <div className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">₹{monthlyComparison.current.toLocaleString()}</div>
              <div className="flex justify-between items-center mt-2 gap-3">
                <div className={cn("text-sm font-semibold flex items-center gap-1", monthlyComparison.change >= 0 ? "text-red-500" : "text-emerald-600")}>
                  {monthlyComparison.change === 0 ? "No change vs last month" : `${Math.abs(monthlyComparison.change)}% vs last month`}
                </div>
                {filteredExpenses.length > 0 && (
                  <button onClick={() => setShowStory(true)} className="flex items-center gap-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md hover:scale-105 transition-transform">
                    Recap
                  </button>
                )}
              </div>
              {settings.monthlyBudget > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-slate-500 dark:text-slate-400">Budget Usage</span>
                    <span className="text-slate-700 dark:text-slate-200">₹{settings.monthlyBudget.toLocaleString()}</span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${budgetUsagePercent}%` }} transition={{ duration: 1, ease: "easeOut" }} className={cn("h-full rounded-full transition-colors duration-500", budgetColorClass)} />
                  </div>
                  <div className="mt-2 text-right text-xs font-bold text-slate-600 dark:text-slate-300">{budgetUsagePercent}% used</div>
                </div>
              )}
            </motion.section>

            <motion.section variants={itemVariants} className={`${surfaceClass} p-6`}>
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
            </motion.section>

            <motion.section variants={itemVariants} className={cn("text-white p-6 rounded-3xl shadow-lg bg-gradient-to-br transition-colors duration-500", insightColors[smartInsight.type])}>
              <h3 className="text-sm font-bold opacity-90 uppercase tracking-wider mb-2">Insight</h3>
              <div className="text-sm font-medium leading-relaxed opacity-95">{smartInsight.message}</div>
            </motion.section>

            <motion.section variants={itemVariants} className={`${surfaceClass} p-6`}>
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
            </motion.section>

            <motion.section variants={itemVariants} className={`${surfaceClass} p-6`}>
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
            </motion.section>
          </div>

          <div className="space-y-6">
            <motion.section variants={itemVariants} className={`${surfaceClass} p-6 h-full`}>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">R</span>
                Recent
              </h3>
              <div className="space-y-0.5">
                {filteredExpenses.slice(0, visibleCount).length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-10 italic">No recent transactions</p>
                ) : (
                  filteredExpenses.slice(0, visibleCount).map((expense) => (
                    <div key={expense.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors cursor-default">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-lg text-slate-700 dark:text-slate-200 shadow-sm group-hover:scale-110 transition-transform">
                          {expense.category[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{expense.category}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{expense.note || expense.time || "No note"}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">-₹{expense.amount.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{expense.date}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {filteredExpenses.length > visibleCount && (
                <div className="mt-4 text-center">
                  <button onClick={() => setVisibleCount((prev) => prev + 5)} className="text-xs font-bold text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 hover:underline cursor-pointer p-2">
                    View More ({filteredExpenses.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </motion.section>
          </div>
        </div>
      </motion.div>
    </>
  );
}
