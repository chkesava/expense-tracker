import { useFinanceData } from "./useFinanceData";

export const useIncomes = () => {
  const { incomes, incomesLoading } = useFinanceData();
  return { incomes, loading: incomesLoading };
};
