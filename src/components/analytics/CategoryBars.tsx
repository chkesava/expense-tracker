import { useState } from "react";
import type { Expense } from "../../types/expense";
import { groupByCategory } from "../../utils/analytics";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import Amount from "../common/Amount";
import { ChevronDown, Calendar } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  Food: "bg-warning",
  "Food & Dining": "bg-warning",
  Transport: "bg-info",
  Transportation: "bg-info",
  Shopping: "bg-primary",
  Entertainment: "bg-primary",
  Health: "bg-destructive",
  Education: "bg-info",
  Other: "bg-muted-foreground",
  Miscellaneous: "bg-muted-foreground",
  Bills: "bg-info",
  Travel: "bg-success",
  Housing: "bg-warning",
  Finance: "bg-success",
  Technology: "bg-info",
  Investments: "bg-success",
  Family: "bg-destructive",
  "Fitness & Nutrition": "bg-success",
};

type GroupRow = { category: string; value: number };

export default function CategoryBars({
  expenses,
  groupFn = groupByCategory,
  label = "Category Breakdown",
}: {
  expenses: Expense[];
  groupFn?: (expenses: Expense[]) => GroupRow[];
  label?: string;
}) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  if (!expenses.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <strong className="text-foreground">{label}</strong>
        <p className="mt-2 text-sm font-medium text-muted-foreground">No data for this month</p>
      </div>
    );
  }

  const grouped = groupFn(expenses);
  const totals = Object.fromEntries(grouped.map((g) => [g.category, g.value]));
  const grandTotal = Object.values(totals).reduce((sum, v) => sum + v, 0);
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  const matchExpenses = (key: string) => {
    if (key.includes(" › ")) {
      const [parent, sub] = key.split(" › ");
      return expenses.filter((e) => e.category === parent && e.subcategory === sub);
    }
    return expenses.filter((e) => e.category === key);
  };

  return (
    <div className="space-y-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Tap a row to list expenses
      </div>
      {sorted.map(([category, amount]) => {
        const percent = grandTotal === 0 ? 0 : Math.round((amount / grandTotal) * 100);
        const colorKey = category.includes(" › ") ? category.split(" › ")[0] : category;
        const colorClass = CATEGORY_COLORS[colorKey] || "bg-primary";
        const isExpanded = expandedCategory === category;
        const categoryExpenses = matchExpenses(category);

        return (
          <div
            key={category}
            onClick={() => setExpandedCategory(isExpanded ? null : category)}
            className={cn(
              "cursor-pointer select-none rounded-2xl border p-3.5 transition-all duration-200",
              isExpanded
                ? "border-border bg-muted/40 shadow-sm"
                : "border-transparent bg-transparent hover:bg-muted/30"
            )}
          >
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-foreground">
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", colorClass)} />
                <span className="truncate">{category}</span>
                <ChevronDown
                  size={14}
                  className={cn(
                    "shrink-0 text-muted-foreground transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )}
                />
              </span>
              <span className="tabular-nums">
                <Amount value={amount} /> · {percent}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", colorClass)} style={{ width: `${percent}%` }} />
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    {categoryExpenses.map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar size={12} />
                          {expense.date}
                          {expense.note ? ` · ${expense.note}` : ""}
                        </span>
                        <span className="font-semibold tabular-nums text-foreground">
                          <Amount value={expense.amount} />
                        </span>
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
