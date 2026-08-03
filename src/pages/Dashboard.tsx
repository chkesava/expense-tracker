import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { motion, type Variants, Reorder, AnimatePresence } from "framer-motion";
import {
  GripVertical,
  Check,
  Sparkles,
  ArrowRight,
  Zap,
  BarChart3,
  History as HistoryIcon,
  LayoutGrid,
  Search,
  ChevronRight,
  Repeat,
  TrendingUp,
  PiggyBank,
  Target,
} from "lucide-react";
import { toast } from "../lib/toast";
import GamificationCard from "../components/GamificationCard";
import FocusWidget from "../components/focus/FocusWidget";
import FocusConfigModal from "../components/focus/FocusConfigModal";
import { Skeleton } from "../components/common/Skeleton";
import EmptyState from "../components/common/EmptyState";
import { useExpenses } from "../hooks/useExpenses";
import { useIncomes } from "../hooks/useIncomes";
import { useSubscriptions } from "../hooks/useSubscriptions";
import { useCategoryBudgets } from "../hooks/useCategoryBudgets";
import { useFinancialGoals } from "../hooks/useFinancialGoals";
import { useAuth } from "../hooks/useAuth";
import { useAccounts } from "../hooks/useAccounts";
import { usePortfolioMetrics } from "../features/portfolio/hooks/usePortfolioMetrics";
import PortfolioQuickViewModal from "../features/portfolio/components/PortfolioQuickViewModal";
import useSettings, { DEFAULTS } from "../hooks/useSettings";
import { useModals } from "../hooks/useModals";
import { db } from "../firebase";
import { groupByCategory, groupByMonth } from "../utils/analytics";
import { getUsageColor, getSmartInsight } from "../utils/insights";
import { CATEGORIES } from "../types/expense";
import { cn } from "../lib/utils";
import { monthFromDateKey, todayDateKey, currentMonthKey } from "../utils/dates";
import { getBudgetForecasts } from "../utils/rangeAnalytics";
import MagicChatEntry from "../components/MagicChatEntry";
import NumberTicker from "../components/common/NumberTicker";
import Amount from "../components/common/Amount";
import { Badge } from "../components/common/Badge";
import PageShell from "../components/layout/PageShell";
import { Card } from "../components/ui/Card";
import { ICON_SIZE, ICON_STROKE } from "../lib/iconSizes";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 18 } },
};

const softSurfaceClass =
  "rounded-2xl border border-border bg-muted/40 transition-colors duration-200";

const getPreviousMonthKey = (month: string) => {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const m = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(m) || m < 1 || m > 12) return month;
  const d = new Date(year, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const insightToneClass: Record<string, string> = {
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  danger: "bg-destructive text-destructive-foreground",
  neutral: "bg-secondary text-secondary-foreground",
};

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
      {icon}
      {children}
    </h3>
  );
}

export default function Dashboard() {
  const { expenses, loading: expensesLoading } = useExpenses();
  const { incomes, loading: incomesLoading } = useIncomes();
  const loading = expensesLoading || incomesLoading;
  const { accounts } = useAccounts();
  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const {
    holdings: stockHoldings,
    summary: stockSummary,
    loading: portfolioLoading,
    isRefreshing: portfolioRefreshing,
    lastUpdated: portfolioLastUpdated,
  } = usePortfolioMetrics();
  const { subscriptions } = useSubscriptions();
  const { budgets } = useCategoryBudgets();
  const { goals } = useFinancialGoals();
  const { user } = useAuth();
  const { settings, setDashboardOrder } = useSettings();
  const navigate = useNavigate();

  const months = useMemo(() => Array.from(new Set(expenses.map((e) => e.month))).sort().reverse(), [expenses]);
  const { globalMonth } = useModals();
  const selectedMonth = globalMonth ?? months[0] ?? "";
  const filteredExpenses = useMemo(
    () => (!selectedMonth ? [] : expenses.filter((e) => e.month === selectedMonth)),
    [expenses, selectedMonth]
  );
  const [visibleCount, setVisibleCount] = useState(7);
  const [isAdding, setIsAdding] = useState(false);
  const [showFocusConfig, setShowFocusConfig] = useState(false);
  const [focusDefaultCategory, setFocusDefaultCategory] = useState<string | undefined>(undefined);
  const [isReordering, setIsReordering] = useState(false);
  const [isPortfolioQuickViewOpen, setIsPortfolioQuickViewOpen] = useState(false);

  const widgets = settings.dashboardWidgets;
  const showFocus = widgets?.focus !== false;
  const showGamification = widgets?.gamification !== false;
  const showSubscriptions = widgets?.subscriptions !== false;
  const showTopCategories = widgets?.topCategories !== false;

  const quickAddDirect = async (category: string, amount: number) => {
    if (!user) return toast.error("Sign in to add expenses");
    setIsAdding(true);
    try {
      const date = todayDateKey(settings.timezone);
      const month = monthFromDateKey(date);
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
    const expenseTotals = Object.fromEntries(groupByMonth(expenses).map((m) => [m.month, m.value]));
    const incomeTotals = Object.fromEntries(groupByMonth(incomes as any).map((m) => [m.month, m.value]));
    const currentExpenses = expenseTotals[selectedMonth] ?? 0;
    const currentIncome = incomeTotals[selectedMonth] ?? 0;
    const previousMonth = getPreviousMonthKey(selectedMonth);
    const prevExpenses = expenseTotals[previousMonth] ?? 0;
    const change = prevExpenses === 0 ? 0 : Math.round(((currentExpenses - prevExpenses) / prevExpenses) * 100);

    return {
      currentExpenses,
      currentIncome,
      prevExpenses,
      change,
      savings: currentIncome - currentExpenses,
      savingsRate: currentIncome > 0 ? Math.round(((currentIncome - currentExpenses) / currentIncome) * 100) : 0,
    };
  }, [expenses, incomes, selectedMonth]);

  const summary = useMemo(
    () => ({
      totalExpenses: monthlyComparison.currentExpenses,
      totalIncome: monthlyComparison.currentIncome,
      savings: monthlyComparison.savings,
      byCategory: Object.fromEntries(topCategories.map((c) => [c.category, c.value])),
    }),
    [monthlyComparison, topCategories]
  );

  const smartInsight = useMemo(
    () => getSmartInsight(filteredExpenses, settings.monthlyBudget, selectedMonth),
    [filteredExpenses, settings.monthlyBudget, selectedMonth]
  );

  const categoryBudgetAlerts = useMemo(() => {
    return budgets
      .filter((budget) => budget.month === selectedMonth)
      .map((budget) => {
        const spent = filteredExpenses
          .filter((expense) => {
            if (expense.category !== budget.category) return false;
            if (budget.subcategory) return expense.subcategory === budget.subcategory;
            return true;
          })
          .reduce((total, expense) => total + expense.amount, 0);
        const percent = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
        const level = percent >= 100 ? "danger" : percent >= 80 ? "warning" : "ok";
        return { ...budget, spent, percent, level };
      })
      .filter((budget) => budget.level !== "ok")
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 3);
  }, [budgets, filteredExpenses, selectedMonth]);

  const isCurrentMonthSelected = useMemo(() => {
    return selectedMonth === currentMonthKey(settings.timezone);
  }, [selectedMonth, settings.timezone]);

  const predictiveAlerts = useMemo(() => {
    if (!isCurrentMonthSelected) return [];
    const todayStr = todayDateKey(settings.timezone);
    const activeBudgets = budgets.filter((b) => b.month === selectedMonth);
    return getBudgetForecasts(filteredExpenses, activeBudgets, todayStr);
  }, [filteredExpenses, budgets, isCurrentMonthSelected, selectedMonth, settings.timezone]);

  const goalProgress = useMemo(() => {
    return goals.map((goal) => ({
      ...goal,
      progress: goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0,
    }));
  }, [goals]);

  const auditableCount = useMemo(() => {
    return expenses.filter((e) => {
      const needsCategory =
        !e.category || e.category === "Other" || e.category === "Uncategorized" || e.category === "Miscellaneous";
      const needsNote = !e.note || e.note.trim() === "" || e.note.toLowerCase().includes("no note");
      return (needsCategory || needsNote) && !e.isAudited;
    }).length;
  }, [expenses]);

  const widgetMap: Record<string, React.ReactNode> = {
    magicChat: <MagicChatEntry deferFinancialContext />,
    ...(settings.enableInvestments
      ? {
          investments: (
            <button
              type="button"
              onClick={() => setIsPortfolioQuickViewOpen(true)}
              className="bento-card flex h-full flex-col justify-between p-5 text-left transition-transform duration-200 hover:-translate-y-0.5"
            >
              <SectionLabel icon={<TrendingUp size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} className="text-primary" />}>
                Investments
              </SectionLabel>
              <div>
                <Amount value={stockSummary.portfolioValue} className="text-2xl font-semibold tracking-tight text-foreground" />
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {stockHoldings.length > 0
                    ? `${stockHoldings.length} tracked holding${stockHoldings.length === 1 ? "" : "s"}`
                    : "Tap to start tracking"}
                </p>
              </div>
            </button>
          ),
        }
      : {}),
    analysisLab: (
      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => navigate("/analysis")}
        className="group flex h-full w-full items-center justify-between rounded-2xl border border-border bg-foreground p-5 text-left text-background transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background/10">
            <Search size={ICON_SIZE.md} strokeWidth={ICON_STROKE} />
          </div>
          <div>
            <h3 className="text-base font-semibold">Analysis Lab</h3>
            <p className="text-xs font-medium text-background/60">Custom insights · Filters</p>
          </div>
        </div>
        <ChevronRight size={ICON_SIZE.sm} className="transition-transform group-hover:translate-x-0.5" />
      </motion.button>
    ),
    audit: auditableCount > 0 && (
      <button
        type="button"
        className="bento-card group relative flex h-full cursor-pointer flex-col justify-between overflow-hidden p-5 text-left transition-transform active:scale-[0.99]"
        onClick={() => navigate("/expenses", { state: { tab: "audit" } })}
      >
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10 text-info">
              <Sparkles size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-info">Cleanup required</span>
          </div>
          <h2 className="mb-1 text-xl font-semibold tracking-tight text-foreground">Audit needed</h2>
          <p className="text-xs font-medium text-muted-foreground">
            {auditableCount} items missing categories or notes
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary">
          Start session
          <ArrowRight size={ICON_SIZE.xs} className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>
    ),
    focus: showFocus && <FocusWidget onOpenConfig={() => setShowFocusConfig(true)} />,
    gamification: showGamification && <GamificationCard />,
    subscriptions: showSubscriptions && (
      <Link to="/subscriptions" className="block h-full">
        <section className="bento-card group flex h-full cursor-pointer items-center justify-between p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <Repeat size={ICON_SIZE.md} strokeWidth={ICON_STROKE} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Recurring items</h3>
              <p className="text-xs font-medium text-muted-foreground">
                {subscriptions.filter((s) => s.isActive).length} active
              </p>
            </div>
          </div>
          <ChevronRight size={ICON_SIZE.sm} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </section>
      </Link>
    ),
    topCategories: showTopCategories && (
      <section className="bento-card flex h-full flex-col p-5">
        <SectionLabel icon={<BarChart3 size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} className="text-primary" />}>
          Top categories
        </SectionLabel>
        <div className="flex flex-1 flex-col justify-between gap-1">
          {topCategories.length === 0 ? (
            <EmptyState
              icon={<BarChart3 size={ICON_SIZE.lg} strokeWidth={ICON_STROKE} />}
              title="No expense data yet"
              description="Add your first expense to see category breakdowns."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            topCategories.map((item, index) => (
              <div key={item.category} className="border-b border-border py-2.5 last:border-0">
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-xs font-medium text-muted-foreground">{index + 1}.</span>
                    <span className="text-sm font-semibold text-foreground">{item.category}</span>
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-foreground">
                    <Amount value={item.value} />
                  </div>
                </div>
                {settings.monthlyBudget > 0 && (
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full opacity-90",
                        getUsageColor((item.value / settings.monthlyBudget) * 100).split(" ")[0]
                      )}
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
      <Card className="relative h-full overflow-hidden border-0 bg-foreground text-background" padding="lg">
        <div className="relative z-10 flex h-full flex-col justify-between">
          {loading ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24 bg-background/10" />
                <Skeleton className="h-4 w-16 bg-background/10" />
              </div>
              <Skeleton className="h-10 w-32 bg-background/10" />
              <div className="space-y-3">
                <Skeleton className="h-8 w-full bg-background/10" />
                <Skeleton className="h-8 w-full bg-background/10" />
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-background/60">Overview</h3>
                  <Badge variant="ghost" className="border-0 bg-background/10 py-1 text-background">
                    {selectedMonth}
                  </Badge>
                </div>
                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-success">Income</p>
                    <p className="privacy-blur text-2xl font-semibold tracking-tight tabular-nums text-background">
                      ₹<NumberTicker value={summary.totalIncome} />
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-destructive">Expenses</p>
                    <p className="privacy-blur text-2xl font-semibold tracking-tight tabular-nums text-background">
                      ₹<NumberTicker value={summary.totalExpenses} />
                    </p>
                  </div>
                </div>
                <div className="mb-6 rounded-2xl border border-background/10 bg-background/5 p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-background/50">Monthly savings</p>
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        summary.savings >= 0 ? "text-success" : "text-destructive"
                      )}
                    >
                      <Amount value={summary.savings} prefix={summary.savings >= 0 ? "+" : ""} />
                    </p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, Math.min(100, monthlyComparison.savingsRate))}%` }}
                      className="h-full rounded-full bg-success"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.06em] text-background/50">
                  Top spend categories
                </p>
                {Object.entries(summary.byCategory)
                  .slice(0, 2)
                  .map(([cat, amt]) => (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-background/70">{cat}</span>
                        <span className="tabular-nums text-background">
                          <Amount value={amt} />
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-background/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${summary.totalExpenses > 0 ? (amt / summary.totalExpenses) * 100 : 0}%`,
                          }}
                          className="h-full rounded-full bg-background/40"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </Card>
    ),
    quickAdd: (
      <section className="bento-card h-full p-5">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">Q</span>
          Quick add
        </h3>
        <div className="mt-1 text-xs font-medium text-muted-foreground">Tap a preset to add instantly</div>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.slice(0, 6).map((category) => (
            <button
              key={category}
              type="button"
              className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary disabled:opacity-50"
              onClick={() => quickAddDirect(category, 100)}
              disabled={isAdding}
            >
              {category} · <Amount value={100} />
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2 border-t border-border pt-4">
          <button
            type="button"
            className="flex-1 rounded-xl border border-border bg-muted/40 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            onClick={() => quickAddDirect("Food", 50)}
            disabled={isAdding}
          >
            <Amount value={50} />
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl border border-border bg-muted/40 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            onClick={() => quickAddDirect("Transport", 100)}
            disabled={isAdding}
          >
            <Amount value={100} />
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl border border-border bg-muted/40 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            onClick={() => quickAddDirect("Other", 200)}
            disabled={isAdding}
          >
            <Amount value={200} />
          </button>
        </div>
      </section>
    ),
    insight: (
      <section className={cn("h-full rounded-2xl p-5 shadow-sm transition-colors", insightToneClass[smartInsight.type])}>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] opacity-90">Insight</h3>
        <div className="text-sm font-medium leading-relaxed opacity-95">{smartInsight.message}</div>
      </section>
    ),
    budgetAlerts: (
      <section className="bento-card h-full p-5">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <span className="rounded-lg bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">B</span>
          Budget alerts
        </h3>
        <div className="space-y-3">
          {categoryBudgetAlerts.length === 0 ? (
            <EmptyState
              icon={<PiggyBank size={ICON_SIZE.lg} strokeWidth={ICON_STROKE} />}
              title="All budgets on track"
              description="No category budget alerts for this month."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            categoryBudgetAlerts.map((budget) => (
              <div
                key={budget.id}
                className={cn(
                  "rounded-2xl border p-4",
                  budget.level === "danger"
                    ? "border-destructive/20 bg-destructive/10"
                    : "border-warning/20 bg-warning/10"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {budget.category}
                      {budget.subcategory ? ` › ${budget.subcategory}` : ""}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                      <Amount value={budget.spent} /> of <Amount value={budget.amount} />
                    </div>
                  </div>
                  <Badge variant={budget.level === "danger" ? "danger" : "warning"} className="px-2 py-0.5 text-[10px]">
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
      <section className="bento-card h-full p-5">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <span className="rounded-lg bg-success/10 px-2 py-1 text-xs font-semibold text-success">G</span>
          Financial goals
        </h3>
        <div className="space-y-3">
          {goalProgress.length === 0 ? (
            <EmptyState
              icon={<Target size={ICON_SIZE.lg} strokeWidth={ICON_STROKE} />}
              title="No goals yet"
              description="Set a financial goal to track progress here."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            goalProgress.slice(0, 3).map((goal) => (
              <div key={goal.id} className={cn("p-4", softSurfaceClass)}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{goal.name}</div>
                    <div className="text-xs font-medium text-muted-foreground">
                      <Amount value={goal.currentAmount} /> of <Amount value={goal.targetAmount} />
                    </div>
                  </div>
                  <Badge variant="success" className="px-2 py-0.5 text-[10px]">
                    {goal.progress}%
                  </Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-success" style={{ width: `${goal.progress}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    ),
    recentActivity: (
      <div className="bento-card relative h-full p-5">
        <div className="mb-4 flex items-center justify-between">
          <SectionLabel icon={<HistoryIcon size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} />}>
            Recent activity
          </SectionLabel>
          <button
            type="button"
            onClick={() => navigate("/expenses")}
            className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
          >
            View all
          </button>
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
            <EmptyState
              icon={<HistoryIcon size={ICON_SIZE.lg} strokeWidth={ICON_STROKE} />}
              title="No expenses this month"
              description="Your recent transactions will show up here."
              className="border-0 bg-transparent py-10"
            />
          ) : (
            filteredExpenses.slice(0, visibleCount).map((expense) => (
              <div
                key={expense.id}
                className="group flex cursor-pointer items-center justify-between border-b border-border py-2.5 last:border-0 transition-opacity hover:opacity-80"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground transition-transform group-hover:scale-105">
                    {expense.category[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-tight text-foreground">
                      {expense.category}
                      {expense.subcategory ? (
                        <span className="font-medium text-muted-foreground"> › {expense.subcategory}</span>
                      ) : null}
                    </div>
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {expense.date}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums text-foreground">
                    <Amount value={expense.amount} prefix="-₹" />
                  </div>
                  {accountById.get(expense.accountId ?? "") && (
                    <Badge variant="ghost" className="mt-1 border-0 bg-muted px-1.5 py-0 text-[10px] text-muted-foreground">
                      {accountById.get(expense.accountId ?? "")?.name}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
          {filteredExpenses.length > visibleCount && !loading && (
            <button
              type="button"
              onClick={() => setVisibleCount((v) => v + 5)}
              className="mt-2 w-full py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-primary"
            >
              Load more
            </button>
          )}
        </div>
      </div>
    ),
  };

  const currentOrder = useMemo(() => {
    const savedOrder = settings.dashboardOrder || [];
    const knownIds = [...DEFAULTS.dashboardOrder, "magicChat", "audit"].filter(
      (id) => id !== "investments" || settings.enableInvestments
    );

    return [
      ...savedOrder.filter((id) => knownIds.includes(id)),
      ...knownIds.filter((id) => !savedOrder.includes(id)),
    ];
  }, [settings.dashboardOrder, settings.enableInvestments]);

  return (
    <>
      <FocusConfigModal
        isOpen={showFocusConfig}
        onClose={() => {
          setShowFocusConfig(false);
          setFocusDefaultCategory(undefined);
        }}
        defaultCategory={focusDefaultCategory}
      />
      <PortfolioQuickViewModal
        isOpen={isPortfolioQuickViewOpen}
        onClose={() => setIsPortfolioQuickViewOpen(false)}
        onAddHolding={() => {
          setIsPortfolioQuickViewOpen(false);
          if (settings.enableInvestments) navigate("/investments?add=true");
        }}
        onOpenPortfolio={() => {
          setIsPortfolioQuickViewOpen(false);
          if (settings.enableInvestments) navigate("/investments");
        }}
        holdings={stockHoldings}
        summary={stockSummary}
        loading={portfolioLoading}
        isRefreshing={portfolioRefreshing}
        lastUpdated={portfolioLastUpdated}
      />

      <PageShell width="focus" contentClassName="space-y-5 md:space-y-6">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} className="mb-2 flex items-center justify-between px-0.5">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
              <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {user?.displayName?.split(" ")[0] || "Member"} · Control center
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsReordering(!isReordering)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border transition-colors active:scale-95",
                isReordering
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title="Edit Layout"
            >
              {isReordering ? <Check size={ICON_SIZE.sm} /> : <LayoutGrid size={ICON_SIZE.sm} />}
            </button>
          </motion.div>

          <AnimatePresence>
            {isCurrentMonthSelected && predictiveAlerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -12 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -12 }}
                className="mb-2 overflow-hidden"
              >
                <div className="relative overflow-hidden rounded-2xl border border-warning/20 bg-warning/10 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="text-sm font-semibold text-foreground">Predictive budget alert</h4>
                      <div className="space-y-2">
                        {predictiveAlerts.map((alert) => (
                          <p key={alert.category} className="text-xs leading-relaxed text-muted-foreground">
                            At your current rate, you will exceed your{" "}
                            <strong className="font-semibold text-foreground">{alert.category}</strong> budget by{" "}
                            <span className="font-semibold text-warning">{alert.overshootPercent}%</span> on{" "}
                            <strong className="font-semibold text-foreground">Day {alert.exceedDay}</strong>.{" "}
                            <button
                              type="button"
                              onClick={() => {
                                setFocusDefaultCategory(alert.category);
                                setShowFocusConfig(true);
                              }}
                              className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 font-semibold text-warning hover:underline"
                            >
                              Consider activating a Focus Goal
                              <ArrowRight size={12} className="ml-0.5 inline" />
                            </button>
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="min-h-[600px]">
            {isReordering ? (
              <Reorder.Group
                axis="y"
                values={currentOrder}
                onReorder={setDashboardOrder}
                className="grid grid-cols-1 gap-4 transition-all duration-300 sm:gap-5 md:grid-cols-2"
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {currentOrder.map((id) => {
                    const component = widgetMap[id];
                    if (!component) return null;

                    return (
                      <Reorder.Item
                        key={id}
                        value={id}
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        layout
                        dragListener={isReordering}
                        className={cn(
                          "group relative h-full",
                          (id === "overview" || id === "recentActivity" || id === "magicChat") && "md:col-span-2"
                        )}
                      >
                        {isReordering && (
                          <div className="absolute -left-2 top-1/2 z-30 -translate-y-1/2 cursor-grab rounded-lg border border-border bg-card p-2 text-muted-foreground shadow-sm active:cursor-grabbing hover:text-primary">
                            <GripVertical size={ICON_SIZE.sm} />
                          </div>
                        )}
                        <div
                          className={cn(
                            "h-full transition-transform duration-200",
                            isReordering && "scale-[0.98] group-hover:scale-100"
                          )}
                        >
                          {component}
                        </div>
                      </Reorder.Item>
                    );
                  })}
                </AnimatePresence>
              </Reorder.Group>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
                {currentOrder.map((id) => {
                  const component = widgetMap[id];
                  if (!component) return null;

                  return (
                    <div
                      key={id}
                      className={cn(
                        "relative h-full",
                        (id === "overview" || id === "recentActivity" || id === "magicChat") && "md:col-span-2"
                      )}
                    >
                      {component}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </PageShell>
    </>
  );
}
