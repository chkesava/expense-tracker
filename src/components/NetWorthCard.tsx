import { useMemo, useState } from "react";
import { Eye, EyeOff, TrendingUp, Landmark, CreditCard, PieChart, ShieldCheck, ShieldAlert, Milestone, HelpCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Amount from "./common/Amount";
import { getAccountKind } from "../utils/accountKind";
import { computeBankBalance, computeCreditUsage } from "../utils/accountBalance";
import { getInvestmentValuation } from "../utils/investmentInterest";
import { toLocalDateKey } from "../utils/dates";
import type { Account, AccountType, Expense, Income, AccountPayment, AccountEntry } from "../types/expense";
import type { Investment } from "../types/investment";
import { cn } from "../lib/utils";

interface NetWorthCardProps {
  accounts: Account[];
  accountTypes: AccountType[];
  expenses: Expense[];
  incomes: Income[];
  payments: AccountPayment[];
  entries: AccountEntry[];
  investments: Investment[];
}

function groupByKey<T>(items: T[], getKey: (item: T) => string | null | undefined) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}

export default function NetWorthCard({
  accounts,
  accountTypes,
  expenses,
  incomes,
  payments,
  entries,
  investments,
}: NetWorthCardProps) {
  // Local state for toggling sensitive metric visibility
  const [isPrivate, setIsPrivate] = useState(() => {
    return localStorage.getItem("networth_private") === "true";
  });

  const togglePrivate = () => {
    setIsPrivate((prev) => {
      const next = !prev;
      localStorage.setItem("networth_private", String(next));
      return next;
    });
  };

  // State for active trend chart mode
  const [chartMode, setChartMode] = useState<"net" | "assets-liabilities" | "all">("net");
  const accountTypeNameById = useMemo(
    () => new Map(accountTypes.map((type) => [type.id, type.name])),
    [accountTypes]
  );
  const expensesByAccount = useMemo(() => groupByKey(expenses, (expense) => expense.accountId), [expenses]);
  const incomesByAccount = useMemo(() => groupByKey(incomes, (income) => income.accountId), [incomes]);
  const paymentsFromAccount = useMemo(() => groupByKey(payments, (payment) => payment.fromAccountId), [payments]);
  const paymentsToAccount = useMemo(() => groupByKey(payments, (payment) => payment.toAccountId), [payments]);
  const entriesByAccount = useMemo(() => groupByKey(entries, (entry) => entry.accountId), [entries]);

  // Filter accounts into Cash (non-credit) and Credit
  const cashAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const typeName = accountTypeNameById.get(acc.typeId) || "";
      return getAccountKind(typeName) !== "credit";
    });
  }, [accounts, accountTypeNameById]);

  const creditAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const typeName = accountTypeNameById.get(acc.typeId) || "";
      return getAccountKind(typeName) === "credit";
    });
  }, [accounts, accountTypeNameById]);

  // Current calculations
  const totalCashBalance = useMemo(() => {
    return cashAccounts.reduce((sum, acc) => {
      return sum + computeBankBalance(acc, expenses, incomes, payments, entries);
    }, 0);
  }, [cashAccounts, expenses, incomes, payments, entries]);

  const totalInvestmentValuation = useMemo(() => {
    const todayStr = toLocalDateKey(new Date());
    return investments.reduce((sum, inv) => {
      if (inv.status === "closed") return sum;
      return sum + getInvestmentValuation(inv, todayStr).totalValue;
    }, 0);
  }, [investments]);

  const totalCreditOutstanding = useMemo(() => {
    return creditAccounts.reduce((sum, acc) => {
      return sum + computeCreditUsage(acc, expenses, payments).usedThisCycle;
    }, 0);
  }, [creditAccounts, expenses, payments]);

  const totalAssets = totalCashBalance + totalInvestmentValuation;
  const netWorth = totalAssets - totalCreditOutstanding;

  // Debt to Asset ratio
  const debtToAssetRatio = useMemo(() => {
    if (totalAssets === 0) return totalCreditOutstanding > 0 ? 100 : 0;
    return (totalCreditOutstanding / totalAssets) * 100;
  }, [totalAssets, totalCreditOutstanding]);

  // Average daily expense from past 90 days
  const averageDailyExpense = useMemo(() => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoKey = toLocalDateKey(ninetyDaysAgo);

    const recentExpenses = expenses.filter((e) => e.date >= ninetyDaysAgoKey);
    const total = recentExpenses.reduce((sum, e) => sum + e.amount, 0);
    return total / 90;
  }, [expenses]);

  const runwayDays = useMemo(() => {
    if (averageDailyExpense <= 0) return Infinity;
    return Math.round(totalCashBalance / averageDailyExpense);
  }, [totalCashBalance, averageDailyExpense]);

  // Reconstruct past 6 months chronological end-of-month data
  const trendData = useMemo(() => {
    const dataPoints = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      let dateLabel = "";
      let targetDateKey = "";
      
      if (i === 0) {
        // Today's snapshot
        dateLabel = today.toLocaleDateString(undefined, { month: "short", year: "numeric" });
        targetDateKey = toLocalDateKey(today);
      } else {
        // Month end of index i months ago
        const endOfMonthDate = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
        dateLabel = endOfMonthDate.toLocaleDateString(undefined, { month: "short", year: "numeric" });
        targetDateKey = toLocalDateKey(endOfMonthDate);
      }

      // Compute Cash
      const cashAtDate = cashAccounts.reduce((sum, acc) => {
        if (!acc.id) return sum;
        const opening = acc.openingBalance ?? 0;
        const baseline = acc.balanceAsOfDate;
        const accountExpenses = expensesByAccount.get(acc.id) ?? [];
        const accountIncomes = incomesByAccount.get(acc.id) ?? [];
        const outgoingPayments = paymentsFromAccount.get(acc.id) ?? [];
        const accountEntries = entriesByAccount.get(acc.id) ?? [];

        const totalExp = accountExpenses
          .filter((e) => e.accountId === acc.id && (!baseline || e.date >= baseline) && e.date <= targetDateKey)
          .reduce((s, e) => s + e.amount, 0);
        const totalInc = accountIncomes
          .filter((inc) => inc.accountId === acc.id && (!baseline || inc.date >= baseline) && inc.date <= targetDateKey)
          .reduce((s, inc) => s + inc.amount, 0);
        const totalPay = outgoingPayments
          .filter((p) => p.fromAccountId === acc.id && (!baseline || p.date >= baseline) && p.date <= targetDateKey)
          .reduce((s, p) => s + p.amount, 0);
        const totalAdj = accountEntries
          .filter((entry) => entry.accountId === acc.id && (!baseline || entry.date >= baseline) && entry.date <= targetDateKey)
          .reduce((s, entry) => s + (entry.direction === "credit" ? entry.amount : -entry.amount), 0);

        return sum + (opening + totalInc - totalExp - totalPay + totalAdj);
      }, 0);

      // Compute Credit Outstanding
      const creditAtDate = creditAccounts.reduce((sum, acc) => {
        if (!acc.id) return sum;
        const opening = acc.openingBalance ?? 0;
        const baseline = acc.balanceAsOfDate;
        const accountExpenses = expensesByAccount.get(acc.id) ?? [];
        const incomingPayments = paymentsToAccount.get(acc.id) ?? [];

        const totalExp = accountExpenses
          .filter((e) => e.accountId === acc.id && (!baseline || e.date >= baseline) && e.date <= targetDateKey)
          .reduce((s, e) => s + e.amount, 0);
        const totalPay = incomingPayments
          .filter((p) => p.toAccountId === acc.id && (!baseline || p.date >= baseline) && p.date <= targetDateKey)
          .reduce((s, p) => s + p.amount, 0);

        return sum + Math.max(0, opening + totalExp - totalPay);
      }, 0);

      // Compute Investments
      const investAtDate = investments.reduce((sum, inv) => {
        if (inv.startDate > targetDateKey) return sum;
        if (inv.status === "closed" && inv.closedDate && inv.closedDate < targetDateKey) return sum;
        return sum + getInvestmentValuation(inv, targetDateKey).totalValue;
      }, 0);

      const assets = cashAtDate + investAtDate;
      const net = assets - creditAtDate;

      dataPoints.push({
        name: dateLabel,
        Cash: Math.round(cashAtDate),
        Investments: Math.round(investAtDate),
        Liabilities: Math.round(creditAtDate),
        Assets: Math.round(assets),
        "Net Worth": Math.round(net),
      });
    }

    return dataPoints;
  }, [cashAccounts, creditAccounts, expensesByAccount, incomesByAccount, paymentsFromAccount, paymentsToAccount, entriesByAccount, investments]);

  // Format ratio badge colors
  const ratioBadge = useMemo(() => {
    if (debtToAssetRatio < 10) {
      return {
        label: "Excellent",
        color: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
        icon: <ShieldCheck className="w-3 h-3" />,
      };
    } else if (debtToAssetRatio <= 30) {
      return {
        label: "Healthy",
        color: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
        icon: <Milestone className="w-3 h-3" />,
      };
    } else {
      return {
        label: "High Utilization",
        color: "bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse",
        icon: <ShieldAlert className="w-3 h-3" />,
      };
    }
  }, [debtToAssetRatio]);

  // Format runway days
  const runwayBadge = useMemo(() => {
    if (runwayDays === Infinity || runwayDays > 365) {
      return {
        label: "1 Year+",
        color: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
      };
    } else if (runwayDays < 30) {
      return {
        label: "Critical (< 1 Mo)",
        color: "bg-rose-500/10 text-rose-500 border border-rose-500/20",
      };
    } else {
      const months = Math.round(runwayDays / 30);
      return {
        label: `${months} Mo (${runwayDays} Days)`,
        color: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
      };
    }
  }, [runwayDays]);

  return (
    <div className="bento-card p-6 md:p-8 flex flex-col gap-6 w-full overflow-hidden">
      {/* Title Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Net Worth Tracker
            <span className="text-[10px] font-medium py-0.5 px-2 rounded-full bg-primary/10 text-primary border border-primary/20">
              Consolidated
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aggregated assets (Cash + Investments) minus active card balances.
          </p>
        </div>

        {/* Show/Hide eye button */}
        <button
          onClick={togglePrivate}
          className="p-2 rounded-xl bg-secondary/80 border border-border text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95 shadow-sm"
          title={isPrivate ? "Show metrics" : "Hide metrics"}
        >
          {isPrivate ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
        </button>
      </div>

      {/* Main Aggregated Value Panel */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6 md:items-center">
        <div className="md:col-span-1 flex flex-col gap-1.5 p-5 rounded-2xl bg-secondary/40 border border-border/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <TrendingUp className="w-24 h-24 text-primary" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Net Worth
          </span>
          <div
            className={cn(
              "text-3xl md:text-4xl font-black text-foreground tracking-tight transition-all duration-300",
              isPrivate && "blur-md select-none pointer-events-none"
            )}
          >
            <Amount value={netWorth} showBlur={false} />
          </div>
          <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5 mt-1">
            <span>Liquid Cash & Investments</span>
          </div>
        </div>

        {/* Assets & Liabilities Breakdowns */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:col-span-2 md:gap-4">
          {/* Liquid Cash */}
          <div className="flex flex-col gap-1 p-4 rounded-xl bg-secondary/20 border border-border/40">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Landmark className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-semibold tracking-wide">Cash</span>
            </div>
            <div
              className={cn(
                "text-base md:text-lg font-black text-foreground mt-1 transition-all duration-300",
                isPrivate && "blur-sm select-none pointer-events-none"
              )}
            >
              <Amount value={totalCashBalance} showBlur={false} />
            </div>
            <span className="text-[9px] text-muted-foreground">Bank & Cash Accounts</span>
          </div>

          {/* Investments */}
          <div className="flex flex-col gap-1 p-4 rounded-xl bg-secondary/20 border border-border/40">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-500">
                <PieChart className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-semibold tracking-wide">Investments</span>
            </div>
            <div
              className={cn(
                "text-base md:text-lg font-black text-foreground mt-1 transition-all duration-300",
                isPrivate && "blur-sm select-none pointer-events-none"
              )}
            >
              <Amount value={totalInvestmentValuation} showBlur={false} />
            </div>
            <span className="text-[9px] text-muted-foreground">Valuation Today</span>
          </div>

          {/* Liabilities */}
          <div className="flex flex-col gap-1 p-4 rounded-xl bg-secondary/20 border border-border/40">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="p-1 rounded-lg bg-rose-500/10 text-rose-500">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-semibold tracking-wide">Liabilities</span>
            </div>
            <div
              className={cn(
                "text-base md:text-lg font-black text-rose-500 mt-1 transition-all duration-300",
                isPrivate && "blur-sm select-none pointer-events-none"
              )}
            >
              <Amount value={totalCreditOutstanding} prefix="-₹" showBlur={false} />
            </div>
            <span className="text-[9px] text-rose-400">Credit Outstanding</span>
          </div>
        </div>
      </div>

      {/* Historical Trend and Key Markers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-t border-border/50 pt-6">
        {/* Trend Area Chart (col-span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-bold text-foreground">6-Month Trend Overview</span>
            
            {/* Chart Mode Toggle */}
            <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-secondary/80 p-1 text-[10px] font-bold">
              <button
                onClick={() => setChartMode("net")}
                className={cn(
                  "px-2 py-1 rounded-lg transition-all duration-200",
                  chartMode === "net" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Net Worth
              </button>
              <button
                onClick={() => setChartMode("assets-liabilities")}
                className={cn(
                  "px-2 py-1 rounded-lg transition-all duration-200",
                  chartMode === "assets-liabilities" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Assets vs Liab
              </button>
              <button
                onClick={() => setChartMode("all")}
                className={cn(
                  "px-2 py-1 rounded-lg transition-all duration-200",
                  chartMode === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Detailed
              </button>
            </div>
          </div>

          {/* Recharts Area Chart Container */}
          <div className="w-full h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorLiab" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                    fontSize: "11px",
                    fontFamily: "var(--font-sans)",
                  }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString()}`]}
                />
                {chartMode === "net" && (
                  <Area
                    type="monotone"
                    dataKey="Net Worth"
                    stroke="var(--color-primary, #6366f1)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorNet)"
                  />
                )}
                {chartMode === "assets-liabilities" && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="Assets"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorAssets)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Liabilities"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorLiab)"
                    />
                  </>
                )}
                {chartMode === "all" && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="Cash"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="none"
                    />
                    <Area
                      type="monotone"
                      dataKey="Investments"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="none"
                    />
                    <Area
                      type="monotone"
                      dataKey="Liabilities"
                      stroke="#f43f5e"
                      strokeWidth={2}
                      fill="none"
                    />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Indicators & Recommendations panel (col-span 1) */}
        <div className="flex flex-col gap-4.5 justify-center">
          <span className="text-xs font-bold text-foreground">Financial Health Markers</span>

          {/* Debt-to-Asset Ratio */}
          <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-secondary/30 border border-border/50">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                Debt-to-Asset Ratio
                <span title="Credit Card utilization relative to total asset value">
                  <HelpCircle className="w-3 h-3 text-muted-foreground/60" />
                </span>
              </span>
              <div className={cn("flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg", ratioBadge.color)}>
                {ratioBadge.icon}
                {ratioBadge.label}
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black text-foreground">{debtToAssetRatio.toFixed(1)}%</span>
              <span className="text-[10px] text-muted-foreground">Utilized</span>
            </div>
            {/* Tiny progress bar */}
            <div className="w-full bg-border/40 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  debtToAssetRatio < 10 ? "bg-emerald-500" : debtToAssetRatio <= 30 ? "bg-amber-500" : "bg-rose-500"
                )}
                style={{ width: `${Math.min(100, debtToAssetRatio)}%` }}
              />
            </div>
          </div>

          {/* Cash Runway Cover */}
          <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-secondary/30 border border-border/50">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                Cash Runway
                <span title="How long cash accounts cover average monthly expenses (past 3 months)">
                  <HelpCircle className="w-3 h-3 text-muted-foreground/60" />
                </span>
              </span>
              <div className={cn("text-[10px] font-black px-2 py-0.5 rounded-lg", runwayBadge.color)}>
                {runwayBadge.label}
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black text-foreground">
                {runwayDays === Infinity ? "Infinite" : `${runwayDays} Days`}
              </span>
              <span className="text-[10px] text-muted-foreground">of cover</span>
            </div>
            <p className="text-[9px] text-muted-foreground leading-normal mt-0.5">
              Based on average daily burn rate of <span className="font-semibold">₹{Math.round(averageDailyExpense).toLocaleString()}</span> over the last 90 days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
