import type { Expense } from "../types/expense";

export const groupByCategory = (expenses: Expense[]) => {
  const map: Record<string, number> = {};
  expenses.forEach(e => {
    map[e.category] = (map[e.category] || 0) + e.amount;
  });
  return Object.entries(map).map(([category, value]) => ({ category, value }));
};

export const groupByMonth = (expenses: Expense[]) => {
  const map: Record<string, number> = {};
  expenses.forEach(e => {
    map[e.month] = (map[e.month] || 0) + e.amount;
  });
  return Object.entries(map).map(([month, value]) => ({ month, value }));
};
