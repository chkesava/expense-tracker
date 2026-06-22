import { useIncomesContext } from "./useFinanceData";

export const useIncomes = () => {
  const { incomes, incomesLoading } = useIncomesContext();
  return { incomes, loading: incomesLoading };
};
