import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import Amount from "../common/Amount";
import { cn } from "../../lib/utils";

interface CashFlowCardProps {
  metrics: {
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    savingsRate: number;
  };
}

export default function CashFlowCard({ metrics }: CashFlowCardProps) {
  const { totalIncome, totalExpense, netCashFlow, savingsRate } = metrics;

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const isPositive = netCashFlow >= 0;
  const absoluteSavingsRate = Math.abs(savingsRate);
  const strokeDashoffset = circumference - (Math.min(absoluteSavingsRate, 100) / 100) * circumference;

  return (
    <div className="premium-glass p-6 rounded-3xl flex flex-col justify-between min-h-[250px] relative overflow-hidden transition-all duration-500 hover:shadow-2xl">
      {/* Background blur */}
      <div className={cn(
        "absolute -right-16 -top-16 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700",
        isPositive ? "bg-emerald-500" : "bg-rose-500"
      )} />

      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="text-slate-400 dark:text-slate-500" size={18} />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Net Cash Flow & Savings
          </span>
        </div>
      </div>

      {/* Main Grid: Circle on the right, numbers on the left */}
      <div className="flex items-center justify-between gap-4 mb-6">
        {/* Cash Flow Summary */}
        <div className="space-y-3 flex-1">
          <div className="space-y-0.5">
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Net Cash Flow
            </div>
            <div className={cn(
              "text-3xl font-black tracking-tight",
              isPositive ? "text-emerald-500" : "text-rose-500"
            )}>
              {isPositive ? "+" : "-"}
              <Amount value={Math.abs(netCashFlow)} />
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">
            {savingsRate >= 30 ? (
              <span>Superb savings rate! You are pacing well above recommended targets.</span>
            ) : savingsRate > 0 ? (
              <span>Positive net saving. Keep monitoring variable spend.</span>
            ) : totalIncome === 0 ? (
              <span>No income registered yet for this month.</span>
            ) : (
              <span>Spending is outstripping income. Evaluate fixed category outflows.</span>
            )}
          </p>
        </div>

        {/* Circular Progress Gauge */}
        <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              className="text-slate-100 dark:text-slate-800/80 stroke-current"
              strokeWidth="8"
              fill="transparent"
              r={radius}
              cx="50"
              cy="50"
            />
            {/* Foreground progress circle */}
            <motion.circle
              className={cn(
                "stroke-current",
                isPositive ? "text-emerald-500" : "text-rose-500"
              )}
              strokeWidth="8"
              strokeLinecap="round"
              fill="transparent"
              r={radius}
              cx="50"
              cy="50"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ strokeDasharray: circumference }}
            />
          </svg>
          {/* Inner Text overlay */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-base font-black text-slate-800 dark:text-slate-100 leading-none">
              {savingsRate.toFixed(0)}%
            </span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">
              {isPositive ? "Saved" : "Deficit"}
            </span>
          </div>
        </div>
      </div>

      {/* Income / Expense break down */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <ArrowUpRight size={16} />
          </div>
          <div>
            <div className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              Total Inflow
            </div>
            <div className="text-xs font-black text-slate-800 dark:text-slate-200">
              <Amount value={totalIncome} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
            <ArrowDownRight size={16} />
          </div>
          <div>
            <div className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              Total Outflow
            </div>
            <div className="text-xs font-black text-slate-800 dark:text-slate-200">
              <Amount value={totalExpense} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
