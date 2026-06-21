import type { Account } from "../types/expense";
import { useFinanceData } from "./useFinanceData";

export const useAccounts = () => {
  const { accounts, accountsLoading, addAccount, updateAccount, deleteAccount } = useFinanceData();
  return {
    accounts,
    loading: accountsLoading,
    addAccount,
    updateAccount: (id: string, updates: Partial<Account>) => updateAccount(id, updates),
    deleteAccount,
  };
};
