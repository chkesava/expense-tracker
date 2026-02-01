import type { Expense } from "../types/expense";

export type DayGroup = {
  today: Expense[];
  yesterday: Expense[];
  earlier: Expense[];
};

export function groupExpensesByDay(expenses: Expense[]): DayGroup {
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000)
    .toISOString()
    .slice(0, 10);

  const groups: DayGroup = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  expenses.forEach((expense) => {
    if (expense.date === todayStr) {
      groups.today.push(expense);
    } else if (expense.date === yesterdayStr) {
      groups.yesterday.push(expense);
    } else {
      groups.earlier.push(expense);
    }
  });

  return groups;
}
