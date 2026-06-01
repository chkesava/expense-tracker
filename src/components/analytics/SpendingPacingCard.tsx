import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, CalendarRange } from "lucide-react";
import Amount from "../common/Amount";
import { cn } from "../../lib/utils";

interface SpendingPacingCardProps {
  metrics: {
    currentMonthTotal: number;
    currentMonthMtdTotal: number;
    historicAverageMonthlyTotal: number;
    historicAverageMtdTotal: number;
    dayOfMonth: number;
    totalDays: number;
    pacingPercentage: number;
    projectedEndMonthTotal: number;
  };
}

export default function SpendingPacingCard({ metrics }: SpendingPacingCardProps) {
  const {
    currentMonthMtdTotal,
    historicAverageMtdTotal,
    historicAverageMonthlyTotal,
    dayOfMonth,
    totalDays,
    pacingPercentage,
    projectedEndMonthTotal,
  } = metrics;

  const isAhead = pacingPercentage > 5;
  const isWayAhead = pacingPercentage > 20;
  const isUnder = pacingPercentage < -5;

  // Calculate percentage progress of month and spend
  const timeProgress = (dayOfMonth / totalDays) * 100;
  const spendProgress = Math.min(
    (currentMonthMtdTotal / (historicAverageMonthlyTotal || 1)) * 100,
    100
  );

  return (
    <div className="premium-glass p-6 rounded-3xl flex flex-col justify-between min-h-[250px] relative overflow-hidden transition-all duration-500 hover:shadow-2xl">
      {/* Background soft color wash */}
      <div className={cn(
        "absolute -right-16 -top-16 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700",
        isWayAhead ? "bg-rose-500" : isUnder ? "bg-emerald-500" : "bg-blue-500"
      )} />

      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarRange className="text-slate-400 dark:text-slate-500" size={18} />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Spend Pacing & Run-Rate
          </span>
        </div>
        <div className={cn(
          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide flex items-center gap-1",
          isWayAhead 
            ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
            : isAhead
              ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        )}>
          {isWayAhead ? (
            <>
              <TrendingUp size={12} /> High Velocity
            </>
          ) : isUnder ? (
            <>
              <TrendingDown size={12} /> Under Budget
            </>
          ) : (
            <>
              <TrendingDown size={12} /> On Track
            </>
          )}
        </div>
      </div>

      {/* Large Value & Pacing Alert */}
      <div className="space-y-1 mb-6">
        <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
          Month-to-Date Spend
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            <Amount value={currentMonthMtdTotal} />
          </span>
          <span className={cn(
            "text-xs font-bold",
            pacingPercentage > 0 
              ? "text-rose-500 dark:text-rose-400"
              : "text-emerald-500 dark:text-emerald-400"
          )}>
            {pacingPercentage > 0 ? "+" : ""}
            {pacingPercentage.toFixed(0)}% vs avg
          </span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 font-medium">
          {isWayAhead ? (
            <span>You're spending faster than usual. Try scaling back discretionary purchases.</span>
          ) : isUnder ? (
            <span>Excellent pacing! You are keeping well below your historical average.</span>
          ) : (
            <span>Typical spending pace. Safe to proceed within normal ranges.</span>
          )}
        </p>
      </div>

      {/* Visual Progress Bar Gauge */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>Spend vs Avg Budget</span>
          <span>Day {dayOfMonth} of {totalDays}</span>
        </div>
        <div className="relative h-3 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
          {/* Spend progress bar */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${spendProgress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              isWayAhead 
                ? "bg-gradient-to-r from-rose-400 to-rose-600" 
                : "bg-gradient-to-r from-blue-400 to-indigo-600"
            )}
          />
          
          {/* Time progress pin indicator */}
          <motion.div
            initial={{ left: 0 }}
            animate={{ left: `${timeProgress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute top-0 bottom-0 w-1 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] z-10"
            style={{ transform: "translateX(-50%)" }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-medium text-slate-400 dark:text-slate-500">
          <span>Start</span>
          <span className="text-amber-500 font-bold">Month Progress: {timeProgress.toFixed(0)}%</span>
          <span>EOM</span>
        </div>
      </div>

      {/* Sub-metrics */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
        <div>
          <div className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            EOM Projection
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
            <Amount value={projectedEndMonthTotal} />
          </div>
        </div>
        <div>
          <div className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            Historic MTD Avg
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
            <Amount value={historicAverageMtdTotal} />
          </div>
        </div>
      </div>
    </div>
  );
}
