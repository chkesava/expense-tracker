import { useFinanceData } from "./useFinanceData";

export const useAccountTypes = () => {
  const { accountTypes, accountTypesLoading, addAccountType, deleteAccountType } = useFinanceData();
  return {
    accountTypes,
    loading: accountTypesLoading,
    addAccountType,
    deleteAccountType,
  };
};
