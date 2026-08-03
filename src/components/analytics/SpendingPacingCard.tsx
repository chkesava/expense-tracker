import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, CalendarRange } from "lucide-react";
import Amount from "../common/Amount";
import { cn } from "../../lib/utils";
import { ICON_SIZE, ICON_STROKE } from "../../lib/iconSizes";

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
    historicAverageMonthlyTotal,
    dayOfMonth,
    totalDays,
    pacingPercentage,
    projectedEndMonthTotal,
  } = metrics;

  const isAhead = pacingPercentage > 5;
  const isWayAhead = pacingPercentage > 20;
  const isUnder = pacingPercentage < -5;

  const timeProgress = (dayOfMonth / totalDays) * 100;
  const spendProgress = Math.min(
    (currentMonthMtdTotal / (historicAverageMonthlyTotal || 1)) * 100,
    100
  );

  return (
    <div className="bento-card relative flex min-h-[250px] flex-col justify-between overflow-hidden p-6 transition-shadow duration-300 hover:shadow-md">
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full opacity-15 blur-3xl transition-colors duration-500",
          isWayAhead ? "bg-destructive" : isUnder ? "bg-success" : "bg-info"
        )}
      />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarRange className="text-muted-foreground" size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} />
          <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Spend pacing & run-rate
          </span>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
            isWayAhead
              ? "bg-destructive/10 text-destructive"
              : isAhead
                ? "bg-warning/10 text-warning"
                : "bg-success/10 text-success"
          )}
        >
          {isWayAhead ? (
            <>
              <TrendingUp size={12} /> High velocity
            </>
          ) : isUnder ? (
            <>
              <TrendingDown size={12} /> Under budget
            </>
          ) : (
            <>
              <TrendingDown size={12} /> On track
            </>
          )}
        </div>
      </div>

      <div className="mb-6 space-y-1">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Month-to-date spend
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
            <Amount value={currentMonthMtdTotal} />
          </span>
          <span
            className={cn(
              "text-xs font-semibold tabular-nums",
              pacingPercentage > 0 ? "text-destructive" : "text-success"
            )}
          >
            {pacingPercentage > 0 ? "+" : ""}
            {pacingPercentage.toFixed(0)}% vs avg
          </span>
        </div>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          {isWayAhead ? (
            <span>You're spending faster than usual. Try scaling back discretionary purchases.</span>
          ) : isUnder ? (
            <span>Excellent pacing! You are keeping well below your historical average.</span>
          ) : (
            <span>Typical spending pace. Safe to proceed within normal ranges.</span>
          )}
        </p>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Spend vs avg budget</span>
          <span>
            Day {dayOfMonth} of {totalDays}
          </span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${spendProgress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn(
              "absolute left-0 top-0 h-full rounded-full",
              isWayAhead ? "bg-destructive" : isUnder ? "bg-success" : "bg-primary"
            )}
          />
          <div
            className="absolute top-0 h-full w-0.5 bg-foreground/40"
            style={{ left: `${Math.min(100, timeProgress)}%` }}
            title="Today in month"
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className="font-medium text-muted-foreground">Projected month end</span>
        <span className="font-semibold tabular-nums text-foreground">
          <Amount value={projectedEndMonthTotal} />
        </span>
      </div>
    </div>
  );
}
