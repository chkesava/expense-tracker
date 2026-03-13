import MonthSelector from "../components/MonthSelector";
import { getUsageColor, getSmartInsight } from "../utils/insights";
import { useExpenses } from "../hooks/useExpenses";
import { useMemo, useState } from "react";
import { groupByCategory, groupByMonth } from "../utils/analytics";
import { CATEGORIES } from "../types/expense";
import { useAuth } from "../hooks/useAuth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";
import useSettings from "../hooks/useSettings";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import GamificationCard from "../components/GamificationCard";
import { Link } from "react-router-dom";
import { useSubscriptions } from "../hooks/useSubscriptions";
import FocusWidget from "../components/focus/FocusWidget";
import FocusConfigModal from "../components/focus/FocusConfigModal";
import StoryViewer from "../components/story/StoryViewer";
import { useStoryGenerator } from "../hooks/useStoryGenerator";
import { ChevronRight } from "lucide-react";

export default function Dashboard() {
  const expenses = useExpenses();
  const { subscriptions } = useSubscriptions();
  const months = useMemo(() => {
    return Array.from(new Set(expenses.map((e) => e.month))).sort().reverse();
  }, [expenses]);

  const [userSelectedMonth, setUserSelectedMonth] = useState<string | null>(null);
  const selectedMonth = userSelectedMonth ?? months[0] ?? "";

  const filteredExpenses = useMemo(() => {
    if (!selectedMonth) return [];
    return expenses.filter((e) => e.month === selectedMonth);
  }, [expenses, selectedMonth]);

  const [visibleCount, setVisibleCount] = useState(7);
  const { user } = useAuth();
  const { settings } = useSettings();
  const [isAdding, setIsAdding] = useState(false);

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

  const smartInsight = useMemo(() => {
    return getSmartInsight(filteredExpenses, settings.monthlyBudget, selectedMonth);
  }, [filteredExpenses, settings.monthlyBudget, selectedMonth]);

  const budgetUsagePercent =
    settings.monthlyBudget > 0
      ? Math.min(100, Math.round((monthlyComparison.current / settings.monthlyBudget) * 100))
      : 0;
  const budgetColorClass = getUsageColor(budgetUsagePercent).split(" ")[0];

  const [showFocusConfig, setShowFocusConfig] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const storySlides = useStoryGenerator(filteredExpenses, selectedMonth);

  const widgets = settings.dashboardWidgets;
  const showFocus = widgets?.focus !== false;
  const showGamification = widgets?.gamification !== false;
  const showSubscriptions = widgets?.subscriptions !== false;
  const showTopCategories = widgets?.topCategories !== false;
  const showLeftColumn = showFocus || showGamification || showSubscriptions || showTopCategories;

  return (
    <>
      <StoryViewer isOpen={showStory} onClose={() => setShowStory(false)} slides={storySlides} />
      <MonthSelector months={months} value={selectedMonth} onChange={setUserSelectedMonth} />
      <FocusConfigModal isOpen={showFocusConfig} onClose={() => setShowFocusConfig(false)} />

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="min-h-screen pt-20 md:pt-24 pb-32 px-4 md:px-6 max-w-5xl mx-auto"
      >
        <div className={cn("grid gap-6", showLeftColumn ? "md:grid-cols-3" : "md:grid-cols-1 max-w-2xl mx-auto")}>
          {showLeftColumn && (
            <div className="space-y-6">
              {showFocus && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  <FocusWidget onOpenConfig={() => setShowFocusConfig(true)} />
                </motion.div>
              )}
              {showGamification && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
                  <GamificationCard />
                </motion.div>
              )}
              {showSubscriptions && (
                <Link to="/subscriptions" className="block">
                  <motion.section
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.1 }}
                    className="bg-card-gradient border border-border rounded-xl p-4 flex items-center justify-between hover:shadow-card-hover transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-lg">
                        📅
                      </span>
                      <div>
                        <h3 className="font-medium text-foreground text-sm">Subscriptions</h3>
                        <p className="text-xs text-muted-foreground">
                          {subscriptions.filter((s) => s.isActive).length} active
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </motion.section>
                </Link>
              )}
              {showTopCategories && (
                <motion.section
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                  className="bg-card-gradient border border-border rounded-xl p-4 shadow-card"
                >
                  <h3 className="text-sm font-medium text-foreground mb-4">Top categories</h3>
                  <div className="space-y-3">
                    {topCategories.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No expenses this month</p>
                    ) : (
                      topCategories.map((t, i) => (
                        <div key={t.category} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-muted-foreground w-5">{i + 1}</span>
                            <span className="text-sm text-foreground">{t.category}</span>
                          </div>
                          <span className="text-sm font-medium text-foreground">₹{t.value.toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </motion.section>
              )}
            </div>
          )}

          <div className="space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-card-gradient border border-border rounded-2xl p-6 shadow-card-hover relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" aria-hidden />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">This month</p>
              <p className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight relative">
                ₹{monthlyComparison.current.toLocaleString()}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                <span
                  className={cn(
                    "text-sm font-medium",
                    monthlyComparison.change > 0 ? "text-destructive" : monthlyComparison.change < 0 ? "text-success" : "text-muted-foreground"
                  )}
                >
                  {monthlyComparison.change === 0
                    ? "No change vs last month"
                    : `${monthlyComparison.change > 0 ? "+" : ""}${monthlyComparison.change}% vs last month`}
                </span>
                {filteredExpenses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowStory(true)}
                    className="text-xs font-medium text-primary hover:underline decoration-2"
                  >
                    Recap
                  </button>
                )}
              </div>
              {settings.monthlyBudget > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2">
                    <span>Budget</span>
                    <span>₹{settings.monthlyBudget.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${budgetUsagePercent}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={cn("h-full rounded-full", budgetColorClass)}
                    />
                  </div>
                  <p className="mt-1.5 text-right text-xs text-muted-foreground">{budgetUsagePercent}% used</p>
                </div>
              )}
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="bg-card-gradient border border-border rounded-xl p-4 shadow-card"
            >
              <h3 className="text-sm font-medium text-foreground mb-2">Quick add</h3>
              <p className="text-xs text-muted-foreground mb-4">Tap to add an expense</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="px-3 py-2 bg-muted/80 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-gradient-primary hover:text-primary-foreground hover:border-transparent hover:shadow-glow transition-all disabled:opacity-50"
                    onClick={() => quickAddDirect(c, 100)}
                    disabled={isAdding}
                  >
                    {c} · ₹100
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex gap-2">
                <button
                  type="button"
                  className="flex-1 py-2 bg-muted/80 rounded-xl text-sm font-medium text-foreground hover:bg-gradient-primary hover:text-primary-foreground hover:shadow-glow transition-all disabled:opacity-50"
                  onClick={() => quickAddDirect("Food", 50)}
                  disabled={isAdding}
                >
                  ₹50
                </button>
                <button
                  type="button"
                  className="flex-1 py-2 bg-muted/80 rounded-xl text-sm font-medium text-foreground hover:bg-gradient-primary hover:text-primary-foreground hover:shadow-glow transition-all disabled:opacity-50"
                  onClick={() => quickAddDirect("Transport", 100)}
                  disabled={isAdding}
                >
                  ₹100
                </button>
                <button
                  type="button"
                  className="flex-1 py-2 bg-muted/80 rounded-xl text-sm font-medium text-foreground hover:bg-gradient-primary hover:text-primary-foreground hover:shadow-glow transition-all disabled:opacity-50"
                  onClick={() => quickAddDirect("Other", 200)}
                  disabled={isAdding}
                >
                  ₹200
                </button>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1 }}
              className={cn(
                "rounded-xl p-4 border",
                smartInsight.type === "danger" && "bg-destructive/10 border-destructive/20 text-destructive",
                smartInsight.type === "warning" && "bg-warning/10 border-warning/20 text-foreground",
                smartInsight.type === "success" && "bg-success/10 border-success/20 text-foreground",
                smartInsight.type === "neutral" && "bg-muted border-border text-foreground"
              )}
            >
              <p className="text-xs font-medium uppercase tracking-wide opacity-90 mb-1">
                {smartInsight.type === "danger" ? "Notice" : smartInsight.type === "warning" ? "Insight" : "Tip"}
              </p>
              <p className="text-sm leading-relaxed">{smartInsight.message}</p>
            </motion.section>
          </div>

          <div className="space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1 }}
              className="bg-card-gradient border border-border rounded-xl overflow-hidden shadow-card"
            >
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-medium text-foreground">Recent</h3>
              </div>
              <div className="divide-y divide-border">
                {filteredExpenses.slice(0, visibleCount).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-10 text-center">No recent transactions</p>
                ) : (
                  filteredExpenses.slice(0, visibleCount).map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">
                          {e.category[0]}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{e.category}</p>
                          <p className="text-xs text-muted-foreground truncate">{e.note || e.time || "—"}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-foreground">−₹{e.amount.toLocaleString()}</p>
                        <p className="text-[11px] text-muted-foreground">{e.date}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {filteredExpenses.length > visibleCount && (
                <div className="px-4 py-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 5)}
                    className="text-xs font-medium text-primary hover:underline w-full text-center"
                  >
                    View more ({filteredExpenses.length - visibleCount} left)
                  </button>
                </div>
              )}
            </motion.section>
          </div>
        </div>
      </motion.main>
    </>
  );
}
