import { useEffect, useMemo, useState } from "react";
import Modal from "./common/Modal";
import { useAccounts } from "../hooks/useAccounts";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useExpenses } from "../hooks/useExpenses";
import { useIncomes } from "../hooks/useIncomes";
import { useAccountPayments } from "../hooks/useAccountPayments";
import { useAccountEntries } from "../hooks/useAccountEntries";
import { getAccountKind } from "../utils/accountKind";
import { computeBankBalance, previewBalanceAfterBillPayment } from "../utils/accountBalance";
import { todayDateKey } from "../utils/dates";
import Amount from "./common/Amount";
import { toast } from "react-toastify";

type PayCreditBillModalProps = {
  isOpen: boolean;
  onClose: () => void;
  creditAccountId: string;
  creditAccountName: string;
  suggestedAmount?: number;
  suggestedNote?: string;
  targetCycleStart?: string;
  targetCycleEnd?: string;
};

export default function PayCreditBillModal({
  isOpen,
  onClose,
  creditAccountId,
  creditAccountName,
  suggestedAmount,
  suggestedNote,
  targetCycleStart,
  targetCycleEnd,
}: PayCreditBillModalProps) {
  const { accounts } = useAccounts();
  const { accountTypes } = useAccountTypes();
  const { expenses } = useExpenses();
  const { incomes } = useIncomes();
  const { payments, addPayment, addExternalPayment } = useAccountPayments();
  const { entries } = useAccountEntries();

  const [fromAccountId, setFromAccountId] = useState("");
  const [amount, setAmount] = useState(suggestedAmount?.toString() ?? "");
  const [date, setDate] = useState(todayDateKey());
  const [note, setNote] = useState(suggestedNote ?? "");
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAmount(suggestedAmount?.toString() ?? "");
  }, [suggestedAmount]);

  useEffect(() => {
    setNote(suggestedNote ?? "");
  }, [suggestedNote]);

  const sourceAccounts = useMemo(() => {
    return accounts.filter((a) => {
      const typeName = accountTypes.find((t) => t.id === a.typeId)?.name || "";
      return getAccountKind(typeName) !== "credit" && a.balanceInitialized;
    });
  }, [accounts, accountTypes]);

  const selectedFrom = useMemo(
    () => accounts.find((a) => a.id === fromAccountId),
    [accounts, fromAccountId]
  );

  const balanceAfter = useMemo(() => {
    if (alreadyPaid) return null;
    if (!selectedFrom || !amount) return null;
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) return null;
    return previewBalanceAfterBillPayment(
      selectedFrom,
      expenses,
      incomes,
      payments,
      entries,
      num
    );
  }, [alreadyPaid, selectedFrom, amount, expenses, incomes, payments, entries]);

  const handleSubmit = async () => {
    if (!alreadyPaid && !fromAccountId) {
      toast.error("Select an account to pay from");
      return;
    }
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!alreadyPaid && balanceAfter != null && balanceAfter < 0) {
      toast.error("Insufficient balance in the selected account");
      return;
    }
    setSubmitting(true);
    if (alreadyPaid) {
      await addExternalPayment(
        creditAccountId,
        num,
        date,
        note || `Already paid — ${creditAccountName}`,
        {
          appliedCycleStart: targetCycleStart,
          appliedCycleEnd: targetCycleEnd,
        }
      );
    } else {
      await addPayment(
        fromAccountId,
        creditAccountId,
        num,
        date,
        note || `Bill payment — ${creditAccountName}`,
        {
          appliedCycleStart: targetCycleStart,
          appliedCycleEnd: targetCycleEnd,
        }
      );
    }
    setSubmitting(false);
    setAmount("");
    setNote("");
    setAlreadyPaid(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pay credit card bill">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Pay <span className="font-bold text-foreground">{creditAccountName}</span> from a non-credit
          account. This deducts your account balance only — it does not add an expense.
        </p>

        {sourceAccounts.length === 0 ? (
          <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-800 dark:text-amber-200">
            Add a non-credit account with an opening balance in Settings → Accounts first.
          </p>
        ) : (
          <>
            <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <input
                type="checkbox"
                checked={alreadyPaid}
                onChange={(e) => setAlreadyPaid(e.target.checked)}
              />
              Already paid (mark settled without deducting from an account)
            </label>

            {targetCycleStart && targetCycleEnd && (
              <p className="text-[11px] font-medium text-muted-foreground">
                Applying to bill cycle: {targetCycleStart} to {targetCycleEnd}
              </p>
            )}

            {!alreadyPaid && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Pay from account
                </label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm font-bold"
                >
                  <option value="">Select account</option>
                  {sourceAccounts.map((a) => {
                    const typeName = accountTypes.find((t) => t.id === a.typeId)?.name || "";
                    const bal = computeBankBalance(a, expenses, incomes, payments, entries);
                    return (
                      <option key={a.id} value={a.id}>
                        {a.name} ({typeName}) — ₹{bal.toLocaleString()}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

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
                  placeholder={suggestedAmount ? String(suggestedAmount) : "0"}
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
                placeholder="e.g. March statement"
              />
            </div>

            {balanceAfter != null && selectedFrom && (
              <p className="text-xs font-bold text-muted-foreground">
                Balance after payment: <Amount value={balanceAfter} />
              </p>
            )}

            <button
              type="button"
              disabled={submitting || (!alreadyPaid && !fromAccountId) || !amount}
              onClick={handleSubmit}
              className="w-full rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground disabled:opacity-50"
            >
              {submitting
                ? "Recording…"
                : alreadyPaid
                  ? "Mark bill as already paid"
                  : "Record bill payment"}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
