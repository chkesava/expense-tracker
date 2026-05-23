import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Plus, TrendingUp, PiggyBank, LineChart } from "lucide-react";
import { useInvestments } from "../hooks/useInvestments";
import Amount from "../components/common/Amount";
import CreateInvestmentModal from "../components/CreateInvestmentModal";
import { getInvestmentValuation, totalPortfolioValue } from "../utils/investmentInterest";
import type { Investment, InvestmentKind } from "../types/investment";
import { todayDateKey } from "../utils/dates";
import { cn } from "../lib/utils";

const KIND_LABELS: Record<InvestmentKind, string> = {
  fixed_deposit: "Fixed deposit",
  interest_savings: "Interest savings",
  mutual_fund: "Mutual fund",
};

const SECTIONS: { kind: InvestmentKind; label: string; icon: typeof TrendingUp }[] = [
  { kind: "fixed_deposit", label: "Fixed deposits", icon: PiggyBank },
  { kind: "interest_savings", label: "Interest savings", icon: TrendingUp },
  { kind: "mutual_fund", label: "Mutual funds", icon: LineChart },
];

function daysUntil(dateKey: string): number {
  const today = todayDateKey();
  const ms =
    new Date(dateKey + "T12:00:00").getTime() - new Date(today + "T12:00:00").getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export default function InvestmentsPage({ hideHeader }: { hideHeader?: boolean }) {
  const navigate = useNavigate();
  const { investments, loading } = useInvestments();
  const [showCreate, setShowCreate] = useState(false);
  const asOf = todayDateKey();

  const active = useMemo(
    () => investments.filter((i) => i.status === "active" || i.status === "matured"),
    [investments]
  );

  const portfolioTotal = useMemo(() => totalPortfolioValue(active, asOf), [active, asOf]);

  const byKind = useMemo(() => {
    const map: Record<InvestmentKind, Investment[]> = {
      fixed_deposit: [],
      interest_savings: [],
      mutual_fund: [],
    };
    for (const inv of active) {
      map[inv.kind].push(inv);
    }
    return map;
  }, [active]);

  const renderCard = (inv: Investment) => {
    const valuation = getInvestmentValuation(inv, asOf);
    const maturitySoon =
      inv.maturityDate && inv.status === "active" && daysUntil(inv.maturityDate) <= 30;

    return (
      <motion.button
        key={inv.id}
        type="button"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => navigate(`/investments/${inv.id}`)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card/80 p-4 text-left backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg"
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-foreground">{inv.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {KIND_LABELS[inv.kind]}
            </span>
            {inv.status !== "active" && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-black uppercase",
                  inv.status === "matured"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {inv.status}
              </span>
            )}
          </div>
          {inv.kind !== "mutual_fund" && inv.annualInterestRate != null && (
            <p className="mt-1 text-[10px] font-bold text-muted-foreground">
              {inv.annualInterestRate}% · {inv.interestMethod} · {inv.creditFrequency}
            </p>
          )}
          {inv.kind === "mutual_fund" && inv.units != null && (
            <p className="mt-1 text-[10px] font-bold text-muted-foreground">
              {inv.units} units · NAV {(inv.currentNav ?? inv.purchaseNav)?.toFixed(2)}
            </p>
          )}
          {maturitySoon && (
            <p className="mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              Matures in {daysUntil(inv.maturityDate!)} days
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Value
            </p>
            <Amount value={valuation.totalValue} className="text-lg font-black" />
            {valuation.accruedInterest > 0 && inv.kind !== "mutual_fund" && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                +<Amount value={valuation.accruedInterest} className="inline text-[10px]" /> interest
              </p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </motion.button>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!hideHeader && (
        <div>
          <h2 className="text-2xl font-black text-foreground">Investments</h2>
          <p className="text-sm text-muted-foreground">
            Fixed deposits, interest savings, and mutual funds.
          </p>
        </div>
      )}

      {active.length > 0 && (
        <div className="bento-card p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Portfolio value
          </p>
          <Amount value={portfolioTotal} className="mt-1 text-3xl font-black" />
        </div>
      )}

      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-20 text-center">
          <TrendingUp className="mb-4 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-black text-foreground">No investments yet</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Track FDs with simple monthly interest, daily-compound savings, or mutual funds with
            manual NAV updates.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Add investment
          </button>
        </div>
      ) : (
        <>
          {SECTIONS.map(({ kind, label, icon: Icon }) => {
            const list = byKind[kind];
            if (list.length === 0) return null;
            return (
              <section key={kind}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {label}
                  </h3>
                </div>
                <div className="space-y-2">{list.map(renderCard)}</div>
              </section>
            );
          })}

          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 py-4 text-sm font-black text-primary"
          >
            <Plus className="h-4 w-4" />
            Add investment
          </button>
        </>
      )}

      <CreateInvestmentModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
