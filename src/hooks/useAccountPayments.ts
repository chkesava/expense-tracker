import { useFinanceData } from "./useFinanceData";

export function useAccountPayments() {
  const { payments, paymentsLoading, addPayment, addExternalPayment, deletePayment } = useFinanceData();
  return {
    payments,
    loading: paymentsLoading,
    addPayment,
    addExternalPayment,
    deletePayment,
  };
}
