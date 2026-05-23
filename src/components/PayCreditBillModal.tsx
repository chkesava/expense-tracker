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
import { useNavigate } from "react-router-dom";
import FormField from "./ui/FormField";
import Input from "./ui/Input";
import Button from "./ui/Button";

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
  const navigate = useNavigate();
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
  const [submitError, setSubmitError] = useState("");

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
    setSubmitError("");
    let didSave = false;
    if (alreadyPaid) {
      didSave = await addExternalPayment(
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
      didSave = await addPayment(
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
    if (!didSave) {
      setSubmitError("Could not record this payment. Please try again.");
      return;
    }
    setAmount("");
    setNote("");
    setAlreadyPaid(false);
    setSubmitError("");
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
          <div className="space-y-3 rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-800 dark:text-amber-200">
            <p>Add a non-credit account with an opening balance in Settings → Accounts first.</p>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/settings");
              }}
              className="rounded-lg border border-amber-700/20 bg-amber-100/80 px-3 py-2 text-xs font-black uppercase tracking-widest text-amber-900 dark:bg-amber-400/10 dark:text-amber-100"
            >
              Open settings
            </button>
          </div>
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
              <FormField id="pay-credit-from" label="Pay from account">
                <select
                  id="pay-credit-from"
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
              </FormField>
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField id="pay-credit-amount" label="Amount">
                <Input
                  id="pay-credit-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm font-bold"
                  placeholder={suggestedAmount ? String(suggestedAmount) : "0"}
                />
              </FormField>
              <FormField id="pay-credit-date" label="Date">
                <Input
                  id="pay-credit-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm font-bold"
                />
              </FormField>
            </div>

            <FormField id="pay-credit-note" label="Note" optional>
              <Input
                id="pay-credit-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm font-bold"
                placeholder="e.g. March statement"
              />
            </FormField>

            {balanceAfter != null && selectedFrom && (
              <p className="text-xs font-bold text-muted-foreground">
                Balance after payment: <Amount value={balanceAfter} />
              </p>
            )}
            {submitError && (
              <p className="text-sm font-semibold text-destructive">{submitError}</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                disabled={submitting}
                onClick={onClose}
                variant="secondary"
                className="w-full"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={submitting || (!alreadyPaid && !fromAccountId) || !amount}
                onClick={handleSubmit}
                className="w-full"
              >
                {submitting
                  ? "Recording..."
                  : alreadyPaid
                    ? "Mark bill as already paid"
                    : "Record bill payment"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
