import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useAccounts } from "../hooks/useAccounts";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useExpenses } from "../hooks/useExpenses";
import { useIncomes } from "../hooks/useIncomes";
import { useAccountPayments } from "../hooks/useAccountPayments";
import { useAccountEntries } from "../hooks/useAccountEntries";
import Amount from "../components/common/Amount";
import PayCreditBillModal from "../components/PayCreditBillModal";
import { cn } from "../lib/utils";
import { useModals } from "../hooks/useModals";
import { getAccountKind } from "../utils/accountKind";
import {
  buildAccountActivities,
  computeBankBalance,
  computeCreditUsage,
  getCreditBillHistory,
  toLocalDateKey,
} from "../utils/accountBalance";

export default function AccountDetailPage() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { accountTypes } = useAccountTypes();
  const { expenses } = useExpenses();
  const { incomes } = useIncomes();
  const { payments } = useAccountPayments();
  const { entries } = useAccountEntries();
  const [showPayBill, setShowPayBill] = useState(false);
  const { setAccountEntryAccount } = useModals();

  const account = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId]
  );

  const typeName = useMemo(
    () => (account ? accountTypes.find((t) => t.id === account.typeId)?.name || "" : ""),
    [account, accountTypes]
  );

  const kind = getAccountKind(typeName);

  const accountNameById = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a.name])),
    [accounts]
  );

  const bankBalance = useMemo(() => {
    if (!account || kind === "credit") return null;
    return computeBankBalance(account, expenses, incomes, payments, entries);
  }, [account, kind, expenses, incomes, payments, entries]);

  const creditUsage = useMemo(() => {
    if (!account || kind !== "credit" || !account.billGenerationDay) return null;
    return computeCreditUsage(account, expenses, payments);
  }, [account, kind, expenses, payments]);

  const latestOutstandingBill = useMemo(() => {
    if (!account || kind !== "credit" || !account.billGenerationDay) return null;
    return getCreditBillHistory(account, expenses, payments, 6).find(
      (bill) => bill.outstandingAmount > 0
    ) ?? null;
  }, [account, kind, expenses, payments]);

  const activities = useMemo(() => {
    if (!account) return [];
    return buildAccountActivities(
      account,
      typeName,
      expenses,
      incomes,
      payments,
      entries,
      accountNameById
    );
  }, [account, typeName, expenses, incomes, payments, entries, accountNameById]);

  if (accountsLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-24 pb-32">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-24 pb-32 text-center">
        <p className="text-sm text-muted-foreground">Account not found.</p>
        <button
          type="button"
          onClick={() => navigate("/ledger?tab=accounts")}
          className="mt-4 text-sm font-bold text-primary"
        >
          Back to accounts
        </button>
      </div>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-2xl px-4 pb-32 pt-24 md:px-6"
    >
      <button
        type="button"
        onClick={() => navigate("/ledger?tab=accounts")}
        className="mb-6 flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Accounts
      </button>

      <div className="bento-card p-6">
        <h1 className="text-2xl font-black text-foreground">{account.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{typeName}</p>

        {kind !== "credit" && (
          <div className="mt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current balance</p>
            {account.balanceInitialized ? (
              <>
                <Amount value={bankBalance ?? 0} className="mt-2 text-4xl font-black" />
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Starts from your entered balance, then adds income and subtracts expenses and credit-card
                  bill payments on this account. It updates automatically as transactions are linked here.
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm font-bold text-amber-600 dark:text-amber-400">
                Set your account balance in Settings → Accounts
              </p>
            )}
            {account.openingBalance != null && account.balanceInitialized && (
              <p className="mt-2 text-xs text-muted-foreground">
                Starting balance (when set): <Amount value={account.openingBalance} />
                {account.balanceAsOfDate ? ` · As of ${account.balanceAsOfDate}` : ""}
              </p>
            )}
            {account.balanceInitialized && (
              <button
                type="button"
                onClick={() => setAccountEntryAccount(account)}
                className="mt-4 w-full rounded-xl border border-border bg-muted/50 py-2.5 text-xs font-black uppercase tracking-wider text-foreground"
              >
                Add funds or debit
              </button>
            )}
          </div>
        )}

        {kind === "credit" && creditUsage && (
          <div className="mt-6 space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Outstanding this cycle</p>
              <Amount value={creditUsage.usedThisCycle} className="mt-2 text-3xl font-black" />
            </div>
            {creditUsage.paidThisCycle > 0 && (
              <p className="text-xs font-bold text-emerald-600">
                Paid this cycle: <Amount value={creditUsage.paidThisCycle} />
              </p>
            )}
            {account.creditLimit != null && (
              <>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(100, (creditUsage.usedThisCycle / account.creditLimit) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs font-bold text-muted-foreground">
                  <span>
                    Available: <Amount value={creditUsage.availableCredit} />
                  </span>
                  <span>Limit: <Amount value={account.creditLimit} /></span>
                </div>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Limit resets {creditUsage.nextResetDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              {" "}({creditUsage.daysRemaining} days)
            </p>
            {latestOutstandingBill && (
              <button
                type="button"
                onClick={() => setShowPayBill(true)}
                className="w-full rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground"
              >
                Pay bill from account
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Activity</h2>
        {activities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            No transactions linked to this account yet.
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((act) => (
              <div
                key={`${act.type}-${act.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      act.type === "debit"
                        ? act.isBillPayment
                          ? "bg-indigo-500/10 text-indigo-600"
                          : act.isManualEntry
                            ? "bg-amber-500/10 text-amber-600"
                          : "bg-rose-500/10 text-rose-600"
                        : act.isManualEntry
                          ? "bg-cyan-500/10 text-cyan-600"
                          : "bg-emerald-500/10 text-emerald-600"
                    )}
                  >
                    {act.type === "debit" ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {act.isBillPayment
                        ? act.note || (act.type === "debit" ? "Credit card bill payment" : "Bill payment received")
                        : act.isManualEntry
                          ? act.note ||
                            (act.type === "debit" ? "Manual account debit" : "Manual funds added")
                        : act.note || act.category || act.source || (act.type === "debit" ? "Expense" : "Income")}
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground">
                      {new Date(act.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      {act.isBillPayment
                        ? act.type === "debit"
                          ? ` · Paid to ${act.counterpartyName}`
                          : ` · From ${act.counterpartyName}`
                        : act.isManualEntry
                          ? " · Manual entry"
                        : act.type === "debit"
                          ? " · Debit"
                          : " · Credit"}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Amount
                    value={act.amount}
                    className={cn(
                      "text-sm font-black",
                      act.type === "debit"
                        ? act.isBillPayment
                          ? "text-indigo-600"
                          : act.isManualEntry
                            ? "text-amber-600"
                          : "text-rose-600"
                        : act.isManualEntry
                          ? "text-cyan-600"
                          : "text-emerald-600"
                    )}
                  />
                  {act.runningBalance != null && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Bal: <Amount value={act.runningBalance} />
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {kind === "credit" && (
        <PayCreditBillModal
          isOpen={showPayBill}
          onClose={() => setShowPayBill(false)}
          creditAccountId={account.id}
          creditAccountName={account.name}
          suggestedAmount={latestOutstandingBill?.outstandingAmount}
          suggestedNote={
            latestOutstandingBill
              ? `Bill payment — ${latestOutstandingBill.cycleStart.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })} - ${latestOutstandingBill.cycleEnd.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}`
              : undefined
          }
          targetCycleStart={
            latestOutstandingBill
              ? toLocalDateKey(latestOutstandingBill.cycleStart)
              : undefined
          }
          targetCycleEnd={
            latestOutstandingBill
              ? toLocalDateKey(latestOutstandingBill.cycleEnd)
              : undefined
          }
        />
      )}

    </motion.main>
  );
}
