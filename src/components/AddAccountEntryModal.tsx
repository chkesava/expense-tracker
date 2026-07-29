import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAccountEntries } from "../hooks/useAccountEntries";
import { useAccountPayments } from "../hooks/useAccountPayments";
import { useAccountTransfers } from "../hooks/useAccountTransfers";
import { useAccounts } from "../hooks/useAccounts";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useExpenses } from "../hooks/useExpenses";
import { useIncomes } from "../hooks/useIncomes";
import type { Account } from "../types/expense";
import { computeBankBalance } from "../utils/accountBalance";
import { getAccountKind } from "../utils/accountKind";
import { todayDateKey } from "../utils/dates";
import Amount from "./common/Amount";
import Modal from "./common/Modal";
import FormField from "./ui/FormField";
import Input from "./ui/Input";
import Button from "./ui/Button";

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
  const { transfers, addTransfer } = useAccountTransfers();
  const { accounts } = useAccounts();
  const { accountTypes } = useAccountTypes();

  const [mode, setMode] = useState<"credit" | "debit" | "transfer">("credit");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayDateKey());
  const [note, setNote] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const balanceAfter = useMemo(() => {
    if (!amount) return null;
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) return null;
    const current = computeBankBalance(account, expenses, incomes, payments, entries, transfers);
    return mode === "credit" ? current + num : current - num;
  }, [amount, mode, account, expenses, incomes, payments, entries, transfers]);

  const transferableAccounts = useMemo(() => {
    const typeNameById = new Map(accountTypes.map((type) => [type.id, type.name]));
    return accounts.filter((candidate) =>
      candidate.id !== account.id && getAccountKind(typeNameById.get(candidate.typeId) || "") !== "credit"
    );
  }, [accounts, account.id, accountTypes]);

  const reset = () => {
    setMode("credit");
    setAmount("");
    setDate(todayDateKey());
    setNote("");
    setToAccountId("");
    setSubmitError("");
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
    if (mode === "transfer" && !toAccountId) {
      toast.error("Choose the account to receive the transfer");
      return;
    }

    setSubmitError("");
    setSubmitting(true);
    const didSave = mode === "transfer"
      ? await addTransfer(account.id, toAccountId, num, date, note)
      : await addEntry(account.id, num, mode, date, note);
    setSubmitting(false);
    if (didSave) {
      reset();
      onClose();
      return;
    }
    setSubmitError("Could not save this entry. Please try again.");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Account movement"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Add an adjustment or move money from <span className="font-bold text-foreground">{account.name}</span>.
          None of these actions create Income or Expense entries.
        </p>

        <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setMode("credit")}
            className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition ${
              mode === "credit"
                ? "bg-emerald-500 text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Add funds
          </button>
          <button
            type="button"
            onClick={() => setMode("debit")}
            className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition ${
              mode === "debit"
                ? "bg-rose-500 text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Add debit
          </button>
          <button
            type="button"
            onClick={() => setMode("transfer")}
            className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition ${
              mode === "transfer"
                ? "bg-violet-600 text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Transfer
          </button>
        </div>

        {mode === "transfer" && (
          <FormField id="account-transfer-to" label="Transfer to">
            <select
              id="account-transfer-to"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm font-bold"
              aria-invalid={!!submitError && !toAccountId}
            >
              <option value="">Choose an account</option>
              {transferableAccounts.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
              ))}
            </select>
            {transferableAccounts.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">Add another bank, wallet, or cash account to transfer funds.</p>
            )}
          </FormField>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField id="account-entry-amount" label="Amount">
            <Input
              id="account-entry-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm font-bold"
              placeholder="0"
              aria-invalid={!!submitError && !amount}
            />
          </FormField>
          <FormField id="account-entry-date" label="Date">
            <Input
              id="account-entry-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm font-bold"
              aria-invalid={!!submitError && !date}
            />
          </FormField>
        </div>

        <FormField id="account-entry-note" label="Note" optional>
          <Input
            id="account-entry-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm font-bold"
            placeholder={mode === "credit" ? "e.g. Savings top up" : mode === "transfer" ? "e.g. Cash withdrawal" : "e.g. Cash paid out"}
          />
        </FormField>

        {balanceAfter != null && (
          <p className="text-xs font-bold text-muted-foreground">
            {mode === "transfer" ? "Balance after transfer" : "Balance after entry"}: <Amount value={balanceAfter} />
          </p>
        )}
        {submitError && (
          <p className="text-sm font-semibold text-destructive">{submitError}</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            disabled={submitting}
            onClick={handleClose}
            variant="secondary"
            className="w-full"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting || !amount || !date || (mode === "transfer" && !toAccountId)}
            onClick={handleSubmit}
            className="w-full"
          >
            {submitting
              ? "Saving…"
              : mode === "credit"
                ? "Record funds entry"
                : mode === "debit"
                  ? "Record debit entry"
                  : "Record transfer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
