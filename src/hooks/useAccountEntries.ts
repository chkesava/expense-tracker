import { useAccountsContext } from "./useFinanceData";

export function useAccountEntries() {
  const { entries, entriesLoading, addEntry, deleteEntry } = useAccountsContext();
  return {
    entries,
    loading: entriesLoading,
    addEntry,
    deleteEntry,
  };
}
