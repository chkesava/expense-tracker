import { useAccountsContext } from "./useFinanceData";

/** Internal movements between accounts, kept separate from income and expenses. */
export function useAccountTransfers() {
  const { transfers, transfersLoading, addTransfer, deleteTransfer } = useAccountsContext();
  return {
    transfers,
    loading: transfersLoading,
    addTransfer,
    deleteTransfer,
  };
}
