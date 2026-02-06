import type { Expense } from "../../types/expense";
import { groupByCategory } from "../../utils/analytics";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

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
  if (!expenses.length) {
    return (
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/60">
        <strong className="text-slate-700">Category Breakdown</strong>
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
    <div className="space-y-4">
      {sorted.map(([category, amount], index) => {
        const percent = grandTotal === 0 ? 0 : Math.round((amount / grandTotal) * 100);
        const colorClass = CATEGORY_COLORS[category] || "bg-blue-600"; // Fallback color

        return (
          <motion.div
            key={category}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group"
          >
            <div className="flex justify-between text-sm font-semibold mb-1.5 text-slate-700">
              <span className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", colorClass)} />
                {category}
              </span>
              <span className="text-slate-500">{percent}%</span>
            </div>

            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className={cn("h-full rounded-full shadow-sm", colorClass)}
              />
            </div>
            <div className="mt-1 text-xs text-slate-400 font-medium text-right opacity-0 group-hover:opacity-100 transition-opacity">
              ₹{amount.toLocaleString()}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
