import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import RequestUpiPayment from "../components/RequestUpiPayment";

export default function CollectPaymentPage() {
  const navigate = useNavigate();

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-md px-4 pb-32 pt-20 md:px-6"
    >
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-6 text-center">
        <h1 className="text-2xl font-black tracking-tight text-foreground">Collect Payment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Styled UPI page to share — not added to your ledger
        </p>
      </div>

      <RequestUpiPayment notePrefix="Payment" />
    </motion.main>
  );
}
