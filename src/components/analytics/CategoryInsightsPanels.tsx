import { useMemo, useState } from "react";
import type { Expense } from "../../types/expense";
import type { CategoryBudget } from "../../types/expense";
import Amount from "../common/Amount";
import { cn } from "../../lib/utils";
import {
  FOCUS_LENSES,
  type FocusLensId,
  getBudgetVsActual,
  getLensSummary,
  getTopCategories,
  getTopSubcategories,
} from "../../utils/categoryInsights";
import { getCategoryIcon } from "../../data/categoryTaxonomy";

export function TopSpendLists({ expenses }: { expenses: Expense[] }) {
  const tops = useMemo(() => getTopCategories(expenses, 5), [expenses]);
  const topSubs = useMemo(() => getTopSubcategories(expenses, 6), [expenses]);
  const maxCat = tops[0]?.value || 1;
  const maxSub = topSubs[0]?.value || 1;

  if (!expenses.length) {
    return (
      <p className="text-center text-sm text-slate-400">No spending this month.</p>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Top Categories
        </h3>
        <div className="space-y-2">
          {tops.map((row) => (
            <div key={row.category} className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                <span>
                  {getCategoryIcon(row.category)} {row.category}
                </span>
                <Amount value={row.value} />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                <div
                  className="h-full rounded-full bg-rose-500"
                  style={{ width: `${Math.round((row.value / maxCat) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Top Subcategories
        </h3>
        <div className="space-y-2">
          {topSubs.map((row) => (
            <div key={row.category} className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                <span className="truncate pr-2">{row.category}</span>
                <Amount value={row.value} />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${Math.round((row.value / maxSub) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FocusedSpendingPanel({ expenses }: { expenses: Expense[] }) {
  const [lens, setLens] = useState<FocusLensId>("food");
  const summary = useMemo(() => getLensSummary(expenses, lens), [expenses, lens]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {FOCUS_LENSES.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLens(l.id)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
              lens === l.id
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Total
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            <Amount value={summary.total} />
          </div>
        </div>
        <div className="text-right text-xs font-bold text-slate-400">
          {summary.count} transaction{summary.count === 1 ? "" : "s"}
        </div>
      </div>

      <div className="space-y-2">
        {summary.subs.slice(0, 8).map((row) => (
          <div
            key={row.subcategory}
            className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-xs dark:border-white/5"
          >
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {row.subcategory}
            </span>
            <span className="font-black text-slate-900 dark:text-white">
              <Amount value={row.value} />
            </span>
          </div>
        ))}
        {summary.subs.length === 0 && (
          <p className="text-center text-xs italic text-slate-400">Nothing in this lens.</p>
        )}
      </div>
    </div>
  );
}

export function BudgetVsActualPanel({
  expenses,
  budgets,
  month,
}: {
  expenses: Expense[];
  budgets: CategoryBudget[];
  month: string;
}) {
  const rows = useMemo(
    () => getBudgetVsActual(expenses, budgets, month),
    [expenses, budgets, month]
  );

  if (!rows.length) {
    return (
      <p className="text-center text-sm text-slate-400">
        No category budgets for this month. Add them in Settings.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const over = row.pct > 100;
        return (
          <div
            key={row.key}
            className="rounded-2xl border border-slate-100 p-3 dark:border-white/5"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                  {row.category}
                  {row.subcategory ? (
                    <span className="font-semibold text-slate-400"> › {row.subcategory}</span>
                  ) : null}
                </div>
                <div className="text-[10px] font-bold text-slate-400">
                  <Amount value={row.actual} /> / <Amount value={row.budget} />
                </div>
              </div>
              <div
                className={cn(
                  "shrink-0 text-xs font-black",
                  over ? "text-rose-500" : "text-emerald-600"
                )}
              >
                {row.pct}%
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
              <div
                className={cn("h-full rounded-full", over ? "bg-rose-500" : "bg-emerald-500")}
                style={{ width: `${Math.min(row.pct, 100)}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] font-bold text-slate-400">
              {over ? (
                <>Over by <Amount value={Math.abs(row.remaining)} /></>
              ) : (
                <><Amount value={row.remaining} /> left</>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
