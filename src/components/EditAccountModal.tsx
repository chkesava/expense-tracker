import { useState, useEffect, useMemo } from "react";
import { toast } from "../lib/toast";
import Modal from "./common/Modal";
import { useAccounts } from "../hooks/useAccounts";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { getAccountKind } from "../utils/accountKind";
import { todayDateKey } from "../utils/dates";
import type { Account } from "../types/expense";
import { cn } from "../lib/utils";

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  account: Account;
  onSuccess?: () => void;
};

export default function EditAccountModal({ isOpen, onClose, account, onSuccess }: Props) {
  const { updateAccount } = useAccounts();
  const { accountTypes } = useAccountTypes();

  const [name, setName] = useState(account.name);
  const [typeId, setTypeId] = useState(account.typeId);
  const [openingBalance, setOpeningBalance] = useState(
    account.openingBalance != null ? String(account.openingBalance) : ""
  );
  const [balanceAsOfDate, setBalanceAsOfDate] = useState(
    account.balanceAsOfDate || todayDateKey()
  );
  const [creditLimit, setCreditLimit] = useState(
    account.creditLimit != null ? String(account.creditLimit) : ""
  );
  const [billGenerationDay, setBillGenerationDay] = useState(
    account.billGenerationDay != null ? String(account.billGenerationDay) : ""
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setTypeId(account.typeId);
      setOpeningBalance(account.openingBalance != null ? String(account.openingBalance) : "");
      setBalanceAsOfDate(account.balanceAsOfDate || todayDateKey());
      setCreditLimit(account.creditLimit != null ? String(account.creditLimit) : "");
      setBillGenerationDay(account.billGenerationDay != null ? String(account.billGenerationDay) : "");
    }
  }, [account]);

  const selectedTypeName = useMemo(
    () => accountTypes.find((t) => t.id === typeId)?.name || "",
    [accountTypes, typeId]
  );

  const kind = getAccountKind(selectedTypeName);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Enter account name");
      return;
    }

    const patch: Partial<Account> = {
      name: name.trim(),
      typeId,
    };

    if (kind !== "credit") {
      const bal = Number(openingBalance);
      if (!Number.isFinite(bal)) {
        toast.error("Enter a valid starting balance");
        return;
      }
      patch.openingBalance = bal;
      patch.balanceInitialized = true;
      patch.balanceAsOfDate = balanceAsOfDate || todayDateKey();
    } else {
      const limit = Number(creditLimit);
      const day = Number(billGenerationDay);
      if (!Number.isFinite(limit) || limit <= 0) {
        toast.error("Enter a valid credit limit");
        return;
      }
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        toast.error("Bill generation day must be between 1 and 31");
        return;
      }
      patch.creditLimit = limit;
      patch.billGenerationDay = day;
    }

    setSubmitting(true);

    try {
      await updateAccount(account.id, patch);
      toast.success("Account updated successfully");
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to update account:", err);
      toast.error("Failed to update account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Account / Cash Balance">
      <div className="space-y-4 pt-2">
        <div>
          <label className="text-xs font-bold text-muted-foreground">Account Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. HDFC Bank, SBI Savings, Cash Wallet"
            className={fieldClass}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground">Account Type</label>
          <select
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            className={cn(fieldClass, "cursor-pointer appearance-none")}
          >
            {accountTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {kind !== "credit" ? (
          <>
            <div>
              <label className="text-xs font-bold text-muted-foreground">
                Starting / Cash Balance
              </label>
              <input
                type="number"
                step="any"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="50000"
                className={fieldClass}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Your actual cash/bank starting balance before logged transactions.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">
                Balance As-Of Date
              </label>
              <input
                type="date"
                value={balanceAsOfDate}
                onChange={(e) => setBalanceAsOfDate(e.target.value)}
                className={fieldClass}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="text-xs font-bold text-muted-foreground">Credit Limit</label>
              <input
                type="number"
                step="any"
                min="0"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="100000"
                className={fieldClass}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">
                Bill Generation Day (1 - 31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={billGenerationDay}
                onChange={(e) => setBillGenerationDay(e.target.value)}
                placeholder="15"
                className={fieldClass}
              />
            </div>
          </>
        )}

        <div className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 rounded-xl border border-border py-3 text-xs font-bold text-muted-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="w-1/2 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            Save changes
          </button>
        </div>
      </div>
    </Modal>
  );
}
