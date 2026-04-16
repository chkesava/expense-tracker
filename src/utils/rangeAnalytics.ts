import type { Expense } from "../types/expense";

export interface TimeSeriesPoint {
  date: string;
  amount: number;
}

/**
 * Generates a full time series for a date range, filling in gaps with 0
 */
export const getDailySpendingSeries = (expenses: Expense[], start: string, end: string): TimeSeriesPoint[] => {
  const dailyMap: Record<string, number> = {};
  
  // Initialize map with all dates in range
  const startDate = new Date(start);
  const endDate = new Date(end);
  const current = new Date(startDate);

  while (current <= endDate) {
    const dStr = current.toISOString().split('T')[0];
    dailyMap[dStr] = 0;
    current.setDate(current.getDate() + 1);
  }

  // Populate with actual expense data
  expenses.forEach(e => {
    if (dailyMap[e.date] !== undefined) {
      dailyMap[e.date] += e.amount;
    }
  });

  return Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));
};

/**
 * Calculates spending split between weekdays and weekends
 */
export const getWeekendVsWeekdaySplit = (expenses: Expense[]) => {
  let weekend = 0;
  let weekday = 0;

  expenses.forEach(e => {
    const d = new Date(e.date);
    const day = d.getDay();
    const isWeekend = day === 0 || day === 6; // Sunday or Saturday
    if (isWeekend) weekend += e.amount;
    else weekday += e.amount;
  });

  return { weekend, weekday };
};

/**
 * Groups expenses by note/vendor to find frequency
 */
export const getTopVendors = (expenses: Expense[]) => {
  const map: Record<string, { count: number; total: number }> = {};
  
  expenses.forEach(e => {
    const note = e.note?.trim() || "No Note";
    if (!map[note]) map[note] = { count: 0, total: 0 };
    map[note].count += 1;
    map[note].total += e.amount;
  });

  return Object.entries(map)
    .map(([note, stats]) => ({ note, ...stats }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
};

/**
 * Identifies expenses that are 2x higher than the average for the range
 */
export const getAnomalies = (expenses: Expense[]) => {
  if (expenses.length === 0) return [];
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const avg = total / expenses.length;
  
  return expenses
    .filter(e => e.amount > avg * 2)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
};

/**
 * Groups expenses by day of week
 */
export const getDayOfWeekDistribution = (expenses: Expense[]) => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const map: Record<string, number> = {};
  days.forEach(d => map[d] = 0);

  expenses.forEach(e => {
    const d = new Date(e.date);
    const dayName = days[d.getDay()];
    map[dayName] += e.amount;
  });

  return Object.entries(map).map(([name, amount]) => ({ name, amount }));
};
