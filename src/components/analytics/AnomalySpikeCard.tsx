import { type Expense } from "../../types/expense";
import { AlertCircle, ArrowUpRight, ShieldCheck, ShoppingBag } from "lucide-react";
import Amount from "../common/Amount";
import { cn } from "../../lib/utils";

interface AnomalySpikeCardProps {
  metrics: {
    anomalies: {
      category: string;
      currentSpend: number;
      historicAverage: number;
      percentIncrease: number;
    }[];
    largestTransaction: Expense | null;
  };
}

export default function AnomalySpikeCard({ metrics }: AnomalySpikeCardProps) {
  const { anomalies, largestTransaction } = metrics;
  const hasSpikes = anomalies.length > 0;

  return (
    <div className="premium-glass p-6 rounded-3xl flex flex-col justify-between min-h-[250px] relative overflow-hidden transition-all duration-500 hover:shadow-2xl">
      {/* Background color blob */}
      <div className={cn(
        "absolute -right-16 -top-16 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700",
        hasSpikes ? "bg-amber-500" : "bg-emerald-500"
      )} />

      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="text-slate-400 dark:text-slate-500" size={18} />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Category Spikes & Peak Outflow
          </span>
        </div>
      </div>

      {/* Anomaly / Spikes Section */}
      <div className="space-y-3 mb-4">
        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Spending Anomalies
        </div>
        
        {hasSpikes ? (
          <div className="space-y-2 max-h-[75px] overflow-y-auto custom-scrollbar">
            {anomalies.slice(0, 2).map((a) => (
              <div
                key={a.category}
                className="flex items-center justify-between p-2 rounded-2xl bg-amber-500/10 border border-amber-500/20"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <ArrowUpRight className="text-amber-500 shrink-0" size={14} />
                  <span className="text-xs font-black text-slate-700 dark:text-amber-400 truncate">
                    {a.category}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                    +{a.percentIncrease.toFixed(0)}%
                  </span>
                  <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 block">
                    Avg: <Amount value={a.historicAverage} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={16} className="shrink-0" />
            <span className="text-xs font-semibold leading-tight">
              No anomalous spending spikes detected this month.
            </span>
          </div>
        )}
      </div>

      {/* Peak Transaction Section */}
      <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-2">
        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Peak Transaction
        </div>
        {largestTransaction ? (
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                <ShoppingBag size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 block truncate">
                  {largestTransaction.note || "No note"}
                </span>
                <span className="text-[9px] font-medium text-slate-400 block truncate">
                  {largestTransaction.category} • {largestTransaction.date}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                <Amount value={largestTransaction.amount} />
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs font-medium text-slate-400">
            No transactions logged yet.
          </div>
        )}
      </div>
    </div>
  );
}
