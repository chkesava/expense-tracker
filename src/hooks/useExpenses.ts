import { useExpensesContext } from "./useFinanceData";

export const useExpenses = () => {
  const { expenses, expensesLoading, pendingSyncCount } = useExpensesContext();
  return { expenses, loading: expensesLoading, pendingSyncCount };
};
