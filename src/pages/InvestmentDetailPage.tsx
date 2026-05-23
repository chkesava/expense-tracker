import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useInvestments } from "../hooks/useInvestments";
import { useAccounts } from "../hooks/useAccounts";
import Amount from "../components/common/Amount";
import { getInvestmentValuation } from "../utils/investmentInterest";
import { todayDateKey } from "../utils/dates";
import type { InvestmentStatus } from "../types/investment";
import { cn } from "../lib/utils";

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30";

export default function InvestmentDetailPage() {
  const { investmentId } = useParams();
  const navigate = useNavigate();
  const { investments, loading, updateInvestment, setStatus, deleteInvestment } =
    useInvestments();
  const { accounts } = useAccounts();

  const [navInput, setNavInput] = useState("");
  const [updatingNav, setUpdatingNav] = useState(false);

  const investment = useMemo(
    () => investments.find((i) => i.id === investmentId),
    [investments, investmentId]
  );

  const asOf = todayDateKey();
  const valuation = useMemo(
    () => (investment ? getInvestmentValuation(investment, asOf) : null),
    [investment, asOf]
  );

  const linkedAccountName = useMemo(() => {
    if (!investment?.linkedAccountId) return null;
    return accounts.find((a) => a.id === investment.linkedAccountId)?.name;
  }, [investment, accounts]);

  const handleUpdateNav = async () => {
    if (!investment) return;
    const nav = Number(navInput);
    if (!Number.isFinite(nav) || nav <= 0) return;
    setUpdatingNav(true);
    await updateInvestment(investment.id, {
      currentNav: nav,
      lastNavUpdated: todayDateKey(),
    });
    setNavInput("");
    setUpdatingNav(false);
  };

  const handleStatus = async (status: InvestmentStatus) => {
    if (!investment) return;
    await setStatus(investment.id, status, todayDateKey());
  };

  const handleDelete = async () => {
    if (!investment) return;
    const msg = investment.fundingExpenseId
      ? "Delete this investment? The linked funding expense will remain in your ledger."
      : "Delete this investment?";
    if (!window.confirm(msg)) return;
    await deleteInvestment(investment.id);
    navigate("/ledger?tab=investments");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-24 pb-32">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!investment || !valuation) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-24 pb-32 text-center">
        <p className="text-sm text-muted-foreground">Investment not found.</p>
        <button
          type="button"
          onClick={() => navigate("/ledger?tab=investments")}
          className="mt-4 text-sm font-bold text-primary"
        >
          Back to investments
        </button>
      </div>
    );
  }

  const isInterestBearing = investment.kind !== "mutual_fund";

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-2xl px-4 pb-32 pt-24 md:px-6"
    >
      <button
        type="button"
        onClick={() => navigate("/ledger?tab=investments")}
        className="mb-6 flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Investments
      </button>

      <div className="bento-card p-6">
        <h1 className="text-2xl font-black text-foreground">{investment.name}</h1>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {investment.kind.replace(/_/g, " ")} · {investment.status}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Current value
            </p>
            <Amount value={valuation.totalValue} className="mt-1 text-3xl font-black" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Principal
            </p>
            <Amount value={valuation.principal} className="mt-1 text-xl font-black" />
          </div>
          {isInterestBearing && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Accrued interest
              </p>
              <Amount
                value={valuation.accruedInterest}
                className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400"
              />
            </div>
          )}
          {investment.kind === "mutual_fund" && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Gain / loss
              </p>
              <Amount
                value={valuation.accruedInterest}
                className={cn(
                  "mt-1 text-xl font-black",
                  valuation.accruedInterest >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              />
            </div>
          )}
        </div>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Start date</dt>
            <dd className="font-bold">{investment.startDate}</dd>
          </div>
          {investment.maturityDate && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Maturity</dt>
              <dd className="font-bold">{investment.maturityDate}</dd>
            </div>
          )}
          {isInterestBearing && (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Annual rate</dt>
                <dd className="font-bold">{investment.annualInterestRate}%</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Method</dt>
                <dd className="font-bold capitalize">{investment.interestMethod}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Credit frequency</dt>
                <dd className="font-bold capitalize">
                  {investment.creditFrequency?.replace(/_/g, " ")}
                </dd>
              </div>
            </>
          )}
          {linkedAccountName && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Funded from</dt>
              <dd className="font-bold">{linkedAccountName}</dd>
            </div>
          )}
          {valuation.nextCreditDate && investment.status === "active" && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Next credit</dt>
              <dd className="font-bold">{valuation.nextCreditDate}</dd>
            </div>
          )}
        </dl>
      </div>

      {investment.kind === "mutual_fund" && investment.status === "active" && (
        <section className="mt-6 bento-card p-6">
          <h2 className="text-sm font-black text-foreground">Update NAV</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Current: {(investment.currentNav ?? investment.purchaseNav)?.toFixed(4)} ·{" "}
            {investment.units} units
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="number"
              step="any"
              min="0"
              value={navInput}
              onChange={(e) => setNavInput(e.target.value)}
              placeholder="New NAV"
              className={fieldClass}
            />
            <button
              type="button"
              disabled={updatingNav}
              onClick={handleUpdateNav}
              className="shrink-0 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </section>
      )}

      {isInterestBearing && valuation.schedule.length > 0 && (
        <section className="mt-6 bento-card p-6">
          <h2 className="text-sm font-black text-foreground">Interest schedule</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Month-end credits for simple interest; projected from your terms.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 font-black uppercase tracking-wider">Date</th>
                  <th className="py-2 font-black uppercase tracking-wider">Credit</th>
                  <th className="py-2 font-black uppercase tracking-wider">Balance</th>
                </tr>
              </thead>
              <tbody>
                {valuation.schedule.slice(-12).map((row) => (
                  <tr key={row.date} className="border-b border-border/50">
                    <td className="py-2 font-medium">{row.date}</td>
                    <td className="py-2">
                      <Amount value={row.amount} className="text-xs font-bold" />
                    </td>
                    <td className="py-2">
                      <Amount value={row.balanceAfter} className="text-xs font-bold" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {investment.status === "active" && (
        <div className="mt-6 flex flex-wrap gap-2">
          {investment.kind === "fixed_deposit" && (
            <button
              type="button"
              onClick={() => handleStatus("matured")}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-black text-amber-800 dark:text-amber-300"
            >
              Mark matured
            </button>
          )}
          <button
            type="button"
            onClick={() => handleStatus("closed")}
            className="rounded-xl border border-border px-4 py-2 text-xs font-black text-muted-foreground"
          >
            Close
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleDelete}
        className="mt-8 flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400"
      >
        <Trash2 className="h-4 w-4" />
        Delete investment
      </button>
    </motion.main>
  );
}
