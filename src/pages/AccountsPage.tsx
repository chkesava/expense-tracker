import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Landmark, CreditCard, Wallet, ChevronRight } from "lucide-react";
import { useAccounts } from "../hooks/useAccounts";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useExpenses } from "../hooks/useExpenses";
import { useIncomes } from "../hooks/useIncomes";
import { useAccountPayments } from "../hooks/useAccountPayments";
import { useAccountEntries } from "../hooks/useAccountEntries";
import { useInvestments } from "../hooks/useInvestments";
import Amount from "../components/common/Amount";
import EmptyState from "../components/common/EmptyState";
import { Skeleton } from "../components/common/Skeleton";
import { getAccountKind } from "../utils/accountKind";
import { computeBankBalance, computeCreditUsage } from "../utils/accountBalance";
import NetWorthCard from "../components/NetWorthCard";

export default function AccountsPage({ hideHeader }: { hideHeader?: boolean }) {
  const navigate = useNavigate();
  const { accounts, loading } = useAccounts();
  const { accountTypes } = useAccountTypes();
  const { expenses } = useExpenses();
  const { incomes } = useIncomes();
  const { payments } = useAccountPayments();
  const { entries } = useAccountEntries();
  const { investments, loading: investmentsLoading } = useInvestments();
  const accountTypeNameById = useMemo(
    () => new Map(accountTypes.map((type) => [type.id, type.name])),
    [accountTypes]
  );

  const grouped = useMemo(() => {
    const cashLike: typeof accounts = [];
    const credit: typeof accounts = [];

    for (const acc of accounts) {
      const typeName = accountTypeNameById.get(acc.typeId) || "";
      const kind = getAccountKind(typeName);
      if (kind !== "credit") cashLike.push(acc);
      else credit.push(acc);
    }
    return { cashLike, credit };
  }, [accounts, accountTypeNameById]);

  const renderAccountCard = (acc: (typeof accounts)[0]) => {
    const typeName = accountTypeNameById.get(acc.typeId) || "Unknown";
    const kind = getAccountKind(typeName);

    let primaryLabel = "";
    let primaryValue: number | null = null;
    let secondaryLabel = "";

    if (kind !== "credit") {
      primaryLabel = acc.balanceInitialized ? "Balance" : "Balance not set";
      primaryValue = acc.balanceInitialized
        ? computeBankBalance(acc, expenses, incomes, payments, entries)
        : null;
    } else if (kind === "credit" && acc.billGenerationDay) {
      const usage = computeCreditUsage(acc, expenses, payments);
      primaryLabel = "Used this cycle";
      primaryValue = usage.usedThisCycle;
      secondaryLabel = acc.creditLimit
        ? `${usage.availableCredit.toLocaleString()} available · resets in ${usage.daysRemaining}d`
        : "Set credit limit in Settings";
    }

    return (
      <button
        key={acc.id}
        type="button"
        onClick={() => navigate(`/accounts/${acc.id}`)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/30"
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-foreground">{acc.name}</div>
          <div className="mt-0.5 text-xs font-medium text-muted-foreground">{typeName}</div>
          {secondaryLabel && (
            <div className="mt-1 text-[10px] font-bold text-muted-foreground">{secondaryLabel}</div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {primaryValue != null ? (
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{primaryLabel}</p>
              <Amount value={primaryValue} className="text-lg font-black" />
            </div>
          ) : (
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{primaryLabel}</span>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>
    );
  };

  if (loading || investmentsLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={<Wallet className="h-7 w-7" />}
        title="No accounts yet"
        description="Add bank or credit accounts in Settings → Accounts."
      />
    );
  }

  return (
    <div className="space-y-8">
      {!hideHeader && (
        <div>
          <h2 className="text-2xl font-black text-foreground">Accounts</h2>
          <p className="text-sm text-muted-foreground">Balances, credit usage, and transaction history.</p>
        </div>
      )}

      <NetWorthCard
        accounts={accounts}
        accountTypes={accountTypes}
        expenses={expenses}
        incomes={incomes}
        payments={payments}
        entries={entries}
        investments={investments}
      />

      {grouped.cashLike.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Non-Credit Accounts</h3>
          </div>
          <div className="space-y-2">{grouped.cashLike.map(renderAccountCard)}</div>
        </section>
      )}

      {grouped.credit.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Credit Cards</h3>
          </div>
          <div className="space-y-2">{grouped.credit.map(renderAccountCard)}</div>
        </section>
      )}

    </div>
  );
}
