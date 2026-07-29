import Modal from "../../../components/common/Modal";
import { usePortfolioTransactions } from "../hooks/usePortfolioTransactions";
import type { HoldingWithMetrics } from "../types";
import Amount from "../../../components/common/Amount";
import { Badge } from "../../../components/common/Badge";

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding: HoldingWithMetrics | null;
}

const TYPE_COLORS: Record<string, string> = {
  BUY: "bg-emerald-500/10 text-emerald-600",
  SELL: "bg-rose-500/10 text-rose-600",
  DIVIDEND: "bg-blue-500/10 text-blue-600",
  BONUS: "bg-purple-500/10 text-purple-600",
  SPLIT: "bg-amber-500/10 text-amber-600",
};

export default function TransactionHistoryModal({
  isOpen,
  onClose,
  holding,
}: TransactionHistoryModalProps) {
  const { transactions, loading } = usePortfolioTransactions(holding?.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={holding ? `History — ${holding.symbol}` : "Transaction History"}
      className="sm:max-w-xl"
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No transactions yet.</p>
      ) : (
        <ul className="space-y-3">
          {transactions.map((txn) => (
            <li
              key={txn.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-lg ${TYPE_COLORS[txn.type] ?? ""}`}
                  >
                    {txn.type}
                  </span>
                  <Badge variant={txn.orderStatus === "executed" ? "success" : "ghost"}>
                    {txn.orderStatus}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">{txn.date}</div>
                {txn.notes && (
                  <div className="text-xs text-muted-foreground">{txn.notes}</div>
                )}
              </div>
              <div className="text-right text-sm">
                <div>{txn.quantity} @ <Amount value={txn.price} /></div>
                {txn.fees > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Fees: <Amount value={txn.fees} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
