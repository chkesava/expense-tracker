import { motion } from "framer-motion";
import { Landmark, ArrowRightLeft } from "lucide-react";
import Amount from "../common/Amount";
import { cn } from "../../lib/utils";
import { ICON_SIZE, ICON_STROKE } from "../../lib/iconSizes";

interface FixedVsVariableCardProps {
  metrics: {
    fixedTotal: number;
    variableTotal: number;
    fixedPercentage: number;
    variablePercentage: number;
  };
}

export default function FixedVsVariableCard({ metrics }: FixedVsVariableCardProps) {
  const { fixedTotal, variableTotal, fixedPercentage, variablePercentage } = metrics;
  const total = fixedTotal + variableTotal;
  const isHighFixed = fixedPercentage > 50;

  return (
    <div className="bento-card relative flex min-h-[250px] flex-col justify-between overflow-hidden p-6 transition-shadow duration-300 hover:shadow-md">
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full opacity-15 blur-3xl transition-colors duration-500",
          isHighFixed ? "bg-primary" : "bg-info"
        )}
      />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="text-muted-foreground" size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} />
          <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Fixed vs variable cost split
          </span>
        </div>
      </div>

      <div className="mb-6 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Expense structure
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
            {fixedPercentage.toFixed(0)}%
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            Committed costs <ArrowRightLeft size={10} /> {variablePercentage.toFixed(0)}% variable
          </span>
        </div>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          {isHighFixed ? (
            <span>
              Committed expenses are high. Auditing inactive subscriptions or renegotiating bills could free up cash
              flow.
            </span>
          ) : total === 0 ? (
            <span>No spending data recorded for this month yet.</span>
          ) : (
            <span>Highly flexible budget! Under 50% committed costs leaves you resilient to financial shocks.</span>
          )}
        </p>
      </div>

      <div className="mb-4 space-y-2">
        <div className="relative flex h-4 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${fixedPercentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative h-full rounded-l-full bg-primary"
          >
            {fixedPercentage > 15 && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                Fixed
              </span>
            )}
          </motion.div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${variablePercentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative h-full rounded-r-full bg-info"
          >
            {variablePercentage > 15 && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-info-foreground">
                Variable
              </span>
            )}
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">Fixed outflow</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
            <Amount value={fixedTotal} />
          </div>
          <div className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
            Rent, subs, EMIs, utilities
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-info">Variable outflow</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
            <Amount value={variableTotal} />
          </div>
          <div className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
            Dining, travel, shopping
          </div>
        </div>
      </div>
    </div>
  );
}
