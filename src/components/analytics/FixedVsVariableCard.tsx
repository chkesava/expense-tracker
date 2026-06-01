import { motion } from "framer-motion";
import { Landmark, ArrowRightLeft } from "lucide-react";
import Amount from "../common/Amount";
import { cn } from "../../lib/utils";

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
    <div className="premium-glass p-6 rounded-3xl flex flex-col justify-between min-h-[250px] relative overflow-hidden transition-all duration-500 hover:shadow-2xl">
      {/* Background color blob */}
      <div className={cn(
        "absolute -right-16 -top-16 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700",
        isHighFixed ? "bg-violet-500" : "bg-sky-500"
      )} />

      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Landmark className="text-slate-400 dark:text-slate-500" size={18} />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Fixed vs. Variable Cost Split
          </span>
        </div>
      </div>

      {/* Ratios & Summary */}
      <div className="space-y-2 mb-6">
        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Expense Structure
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {fixedPercentage.toFixed(0)}%
          </span>
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            Committed Costs <ArrowRightLeft size={10} /> {variablePercentage.toFixed(0)}% Variable
          </span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-400 font-medium mt-1">
          {isHighFixed ? (
            <span>Committed expenses are high. Auditing inactive subscriptions or renegotiating bills could free up cash flow.</span>
          ) : total === 0 ? (
            <span>No spending data recorded for this month yet.</span>
          ) : (
            <span>Highly flexible budget! Under 50% committed costs leaves you resilient to financial shocks.</span>
          )}
        </p>
      </div>

      {/* Split Progress Track */}
      <div className="space-y-2 mb-4">
        <div className="relative h-4 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden flex">
          {/* Fixed spend bar */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${fixedPercentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 rounded-l-full relative"
          >
            {fixedPercentage > 15 && (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white uppercase tracking-wider">
                Fixed
              </span>
            )}
          </motion.div>
          {/* Variable spend bar */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${variablePercentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-sky-400 to-blue-600 rounded-r-full relative"
          >
            {variablePercentage > 15 && (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white uppercase tracking-wider">
                Variable
              </span>
            )}
          </motion.div>
        </div>
      </div>

      {/* Dynamic List Info */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
        <div>
          <div className="text-[10px] font-black uppercase text-violet-500 tracking-wider">
            Fixed Outflow
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
            <Amount value={fixedTotal} />
          </div>
          <div className="text-[9px] font-medium text-slate-400 mt-1 truncate">
            Rent, Subs, EMIs, Utilities
          </div>
        </div>
        <div>
          <div className="text-[10px] font-black uppercase text-sky-500 tracking-wider">
            Variable Outflow
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
            <Amount value={variableTotal} />
          </div>
          <div className="text-[9px] font-medium text-slate-400 mt-1 truncate">
            Dining, Travel, Shopping
          </div>
        </div>
      </div>
    </div>
  );
}
