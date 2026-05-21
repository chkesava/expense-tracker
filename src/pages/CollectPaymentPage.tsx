import { Navigate } from "react-router-dom";

/** @deprecated Use /ledger?tab=collect */
export default function CollectPaymentPage() {
  return <Navigate to="/ledger?tab=collect" replace />;
}
