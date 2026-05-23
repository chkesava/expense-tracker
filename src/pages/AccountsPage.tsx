import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Landmark, CreditCard, Wallet, ChevronRight } from "lucide-react";
import { useAccounts } from "../hooks/useAccounts";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useExpenses } from "../hooks/useExpenses";
import { useIncomes } from "../hooks/useIncomes";
import { useAccountPayments } from "../hooks/useAccountPayments";
import { useAccountEntries } from "../hooks/useAccountEntries";
import Amount from "../components/common/Amount";
import EmptyState from "../components/common/EmptyState";
import { Skeleton } from "../components/common/Skeleton";
import { getAccountKind } from "../utils/accountKind";
import { computeBankBalance, computeCreditUsage } from "../utils/accountBalance";

export default function AccountsPage({ hideHeader }: { hideHeader?: boolean }) {
  const navigate = useNavigate();
  const { accounts, loading } = useAccounts();
  const { accountTypes } = useAccountTypes();
  const { expenses } = useExpenses();
  const { incomes } = useIncomes();
  const { payments } = useAccountPayments();
  const { entries } = useAccountEntries();

  const grouped = useMemo(() => {
    const cashLike: typeof accounts = [];
    const credit: typeof accounts = [];

    for (const acc of accounts) {
      const typeName = accountTypes.find((t) => t.id === acc.typeId)?.name || "";
      const kind = getAccountKind(typeName);
      if (kind !== "credit") cashLike.push(acc);
      else credit.push(acc);
    }
    return { cashLike, credit };
  }, [accounts, accountTypes]);

  const renderAccountCard = (acc: (typeof accounts)[0]) => {
    const typeName = accountTypes.find((t) => t.id === acc.typeId)?.name || "Unknown";
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
      <motion.button
        key={acc.id}
        type="button"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => navigate(`/accounts/${acc.id}`)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card/80 p-4 text-left backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg"
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
      </motion.button>
    );
  };

  if (loading) {
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
