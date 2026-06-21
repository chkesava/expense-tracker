import { useFinanceData } from "./useFinanceData";

export function useAccountEntries() {
  const { entries, entriesLoading, addEntry, deleteEntry } = useFinanceData();
  return {
    entries,
    loading: entriesLoading,
    addEntry,
    deleteEntry,
  };
}
