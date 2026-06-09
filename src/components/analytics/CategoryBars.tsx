import { useState } from "react";
import type { Expense } from "../../types/expense";
import { groupByCategory } from "../../utils/analytics";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import Amount from "../common/Amount";
import { ChevronDown, Calendar } from "lucide-react";

// Map categories to specific distinct colors for better visuals
const CATEGORY_COLORS: Record<string, string> = {
  Food: "bg-orange-500",
  Transport: "bg-blue-500",
  Shopping: "bg-pink-500",
  Entertainment: "bg-purple-500",
  Health: "bg-red-500",
  Education: "bg-indigo-500",
  Other: "bg-slate-500",
  Bills: "bg-cyan-500",
  Travel: "bg-emerald-500",
};

export default function CategoryBars({ expenses }: { expenses: Expense[] }) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  if (!expenses.length) {
    return (
      <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/60 dark:border-white/5">
        <strong className="text-slate-700 dark:text-slate-300">Category Breakdown</strong>
        <p className="mt-2 text-sm text-slate-400 font-medium">
          No data for this month
        </p>
      </div>
    );
  }

  const grouped = groupByCategory(expenses);
  const totals = Object.fromEntries(grouped.map(g => [g.category, g.value]));
  const grandTotal = Object.values(totals).reduce((sum, v) => sum + v, 0);

  // Sort categories by value desc for better UX
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
        Tap a category to list expenses
      </div>
      {sorted.map(([category, amount], index) => {
        const percent = grandTotal === 0 ? 0 : Math.round((amount / grandTotal) * 100);
        const colorClass = CATEGORY_COLORS[category] || "bg-blue-600"; // Fallback color
        const isExpanded = expandedCategory === category;
        const categoryExpenses = expenses.filter(e => e.category === category);

        return (
          <div
            key={category}
            onClick={() => setExpandedCategory(isExpanded ? null : category)}
            className={cn(
              "p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer select-none",
              isExpanded
                ? "bg-slate-50/80 dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-sm"
                : "bg-transparent border-transparent hover:bg-slate-50/45 dark:hover:bg-white/5"
            )}
          >
            {/* Header info */}
            <div className="flex justify-between items-center text-sm font-semibold mb-2 text-slate-700 dark:text-slate-200">
              <span className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full shrink-0", colorClass)} />
                <span>{category}</span>
                <ChevronDown
                  size={14}
                  className={cn(
                    "text-slate-400 dark:text-slate-500 transition-transform duration-300",
                    isExpanded && "rotate-180"
                  )}
                />
              </span>
              <span className="text-right flex items-center gap-2">
                <span className="font-black text-slate-900 dark:text-white">
                  <Amount value={amount} />
                </span>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                  ({percent}%)
                </span>
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-slate-200/30 dark:border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                className={cn("h-full rounded-full shadow-sm", colorClass)}
              />
            </div>

            {/* Expanded expense list */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 space-y-2">
                    {categoryExpenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 transition-colors"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {exp.note?.trim() || (
                              <span className="italic text-slate-400 dark:text-slate-500 font-medium">
                                Unspecified note
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1">
                            <Calendar size={10} />
                            {exp.date}
                          </span>
                        </div>
                        <div className="font-black text-slate-900 dark:text-white shrink-0">
                          <Amount value={exp.amount} />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
