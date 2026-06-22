import type { Account } from "../types/expense";
import { useAccountsContext } from "./useFinanceData";

export const useAccounts = () => {
  const { accounts, accountsLoading, addAccount, updateAccount, deleteAccount } = useAccountsContext();
  return {
    accounts,
    loading: accountsLoading,
    addAccount,
    updateAccount: (id: string, updates: Partial<Account>) => updateAccount(id, updates),
    deleteAccount,
  };
};
