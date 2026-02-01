import type { Expense } from "../types/expense";

export function getMonthlyTotals(expenses: Expense[]) {
  const totals: Record<string, number> = {};

  expenses.forEach((e) => {
    totals[e.month] = (totals[e.month] || 0) + e.amount;
  });

  return totals;
}

export function compareCurrentWithPrevious(expenses: Expense[]) {
  const totals = getMonthlyTotals(expenses);
  const months = Object.keys(totals).sort();

  if (months.length < 2) return null;

  const currentMonth = months[months.length - 1];
  const previousMonth = months[months.length - 2];

  const currentTotal = totals[currentMonth];
  const previousTotal = totals[previousMonth];

  const diff = currentTotal - previousTotal;
  const percent =
    previousTotal === 0 ? null : Math.round((diff / previousTotal) * 100);

  return {
    currentMonth,
    previousMonth,
    currentTotal,
    previousTotal,
    diff,
    percent,
  };
}
