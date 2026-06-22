import { useExpensesContext } from "./useFinanceData";

export const useExpenses = () => {
  const { expenses, expensesLoading } = useExpensesContext();
  return { expenses, loading: expensesLoading };
};
