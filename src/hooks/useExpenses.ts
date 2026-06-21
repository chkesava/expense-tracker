import { useFinanceData } from "./useFinanceData";

export const useExpenses = () => {
  const { expenses, expensesLoading } = useFinanceData();
  return { expenses, loading: expensesLoading };
};
