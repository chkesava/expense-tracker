import type { Income } from "../types/expense";

export const getIncomeSummary = (incomes: Income[]) => {
  const total = incomes.reduce((sum, i) => sum + i.amount, 0);
  const bySource = incomes.reduce((acc, i) => {
    acc[i.source] = (acc[i.source] || 0) + i.amount;
    return acc;
  }, {} as Record<string, number>);

  return { total, bySource };
};

export const groupIncomesByDay = (incomes: Income[], timezone: string = "UTC") => {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: timezone });

    return {
        today: incomes.filter(i => i.date === todayStr),
        yesterday: incomes.filter(i => i.date === yesterdayStr),
        earlier: incomes.filter(i => i.date !== todayStr && i.date !== yesterdayStr)
    };
};
