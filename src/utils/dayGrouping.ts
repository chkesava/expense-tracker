
import type { Expense } from "../types/expense";

export type DayGroup = {
  today: Expense[];
  yesterday: Expense[];
  earlier: Expense[];
};

export function groupExpensesByDay(expenses: Expense[], timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone): DayGroup {
  // Use LOCAL time in the specified timezone
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' };

  // Format to parts and reconstruct YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA gives YYYY-MM-DD
  const todayStr = formatter.format(now);

  const yDate = new Date();
  yDate.setDate(now.getDate() - 1);
  const yesterdayStr = formatter.format(yDate);

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
