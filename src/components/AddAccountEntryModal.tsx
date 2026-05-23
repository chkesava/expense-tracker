import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAccountEntries } from "../hooks/useAccountEntries";
import { useAccountPayments } from "../hooks/useAccountPayments";
import { useExpenses } from "../hooks/useExpenses";
import { useIncomes } from "../hooks/useIncomes";
import type { Account } from "../types/expense";
import { computeBankBalance } from "../utils/accountBalance";
import { todayDateKey } from "../utils/dates";
import Amount from "./common/Amount";
import Modal from "./common/Modal";

type AddAccountEntryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  account: Account;
};

export default function AddAccountEntryModal({
  isOpen,
  onClose,
  account,
}: AddAccountEntryModalProps) {
  const { expenses } = useExpenses();
  const { incomes } = useIncomes();
  const { payments } = useAccountPayments();
  const { entries, addEntry } = useAccountEntries();

  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayDateKey());
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const balanceAfter = useMemo(() => {
    if (!amount) return null;
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) return null;
    const current = computeBankBalance(account, expenses, incomes, payments, entries);
    return direction === "credit" ? current + num : current - num;
  }, [amount, direction, account, expenses, incomes, payments, entries]);

  const reset = () => {
    setDirection("credit");
    setAmount("");
    setDate(todayDateKey());
    setNote("");
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!date) {
      toast.error("Select a date");
      return;
    }

    setSubmitting(true);
    await addEntry(account.id, num, direction, date, note);
    setSubmitting(false);
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={direction === "credit" ? "Add funds" : "Add debit"}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This updates only <span className="font-bold text-foreground">{account.name}</span> statement
          and balance. It will not create Income or Expense entries.
        </p>

        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setDirection("credit")}
            className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition ${
              direction === "credit"
                ? "bg-emerald-500 text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Add funds
          </button>
          <button
            type="button"
            onClick={() => setDirection("debit")}
            className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition ${
              direction === "debit"
                ? "bg-rose-500 text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Add debit
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm font-bold"
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm font-bold"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Note (optional)
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm font-bold"
            placeholder={direction === "credit" ? "e.g. Savings top up" : "e.g. Transfer out"}
          />
        </div>

        {balanceAfter != null && (
          <p className="text-xs font-bold text-muted-foreground">
            Balance after entry: <Amount value={balanceAfter} />
          </p>
        )}

        <button
          type="button"
          disabled={submitting || !amount || !date}
          onClick={handleSubmit}
          className="w-full rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground disabled:opacity-50"
        >
          {submitting
            ? "Saving..."
            : direction === "credit"
              ? "Record funds entry"
              : "Record debit entry"}
        </button>
      </div>
    </Modal>
  );
}
