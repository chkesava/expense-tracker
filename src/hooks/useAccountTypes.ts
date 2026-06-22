import { useAccountsContext } from "./useFinanceData";

export const useAccountTypes = () => {
  const { accountTypes, accountTypesLoading, addAccountType, deleteAccountType } = useAccountsContext();
  return {
    accountTypes,
    loading: accountTypesLoading,
    addAccountType,
    deleteAccountType,
  };
};
