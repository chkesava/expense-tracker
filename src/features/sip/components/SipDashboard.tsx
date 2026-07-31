import { useEffect, useMemo, useState } from "react";
import {
  Pause,
  Play,
  Plus,
  SkipForward,
  Trash2,
  Pencil,
  Zap,
  ChevronRight,
} from "lucide-react";
import Amount from "../../../components/common/Amount";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/common/EmptyState";
import { cn } from "../../../lib/utils";
import { useSipPlans } from "../hooks/useSipPlans";
import { useVirtualPortfolio } from "../hooks/useVirtualPortfolio";
import { useSipTransactions } from "../hooks/useSipTransactions";
import { useSipExecutor } from "../hooks/useSipExecutor";
import { useSipAnalytics } from "../hooks/useSipAnalytics";
import SipPlanModal from "./SipPlanModal";
import SipAnalyticsPanel from "./SipAnalyticsPanel";
import {
  executionDayLabel,
  frequencyLabel,
} from "../services/sipSchedule";
import type { SipPlan } from "../types";
import type { SipPlanFormInput } from "../schemas";
import { gainClass, lossClass } from "../../portfolio/utils/styles";

interface SipDashboardProps {
  selectedSipId?: string | null;
  onSelectSip?: (id: string | null) => void;
}

export default function SipDashboard({
  selectedSipId = null,
  onSelectSip,
}: SipDashboardProps) {
  const { plans, loading, addPlan, editPlan, setStatus, skipNext, removePlan } =
    useSipPlans();
  const { positions, summary, best, worst, typeAllocation, symbolAllocation } =
    useVirtualPortfolio(plans);
  const { transactions } = useSipTransactions();
  const { processDueSips, executeNow } = useSipExecutor(plans);
  const analytics = useSipAnalytics(transactions, positions);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SipPlan | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "completed">("all");

  useEffect(() => {
    void processDueSips();
  }, [processDueSips]);

  const filtered = useMemo(() => {
    if (filter === "all") return plans;
    return plans.filter((p) => p.status === filter);
  }, [plans, filter]);

  const handleSave = async (data: SipPlanFormInput) => {
    if (editing) await editPlan(editing.id, data);
    else await addPlan(data);
    setEditing(null);
  };

  if (loading) {
    return (
      <div className="bento-card p-8 animate-pulse space-y-3">
        <div className="h-6 w-1/3 bg-muted rounded" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  if (selectedSipId) {
    return null; // Detail handled by parent
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Virtual SIP</h2>
          <p className="text-xs text-muted-foreground">
            Simulated recurring investments · No real money
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          icon={<Plus size={16} />}
        >
          Create SIP
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Active" value={String(summary.activeCount)} />
        <SummaryCard label="Paused" value={String(summary.pausedCount)} />
        <SummaryCard
          label="Total Invested"
          value={<Amount value={summary.totalInvested} />}
        />
        <SummaryCard
          label="P&L"
          value={
            <span className={summary.profit >= 0 ? gainClass : lossClass}>
              <Amount value={summary.profit} /> ({summary.profitPercent.toFixed(2)}%)
            </span>
          }
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["all", "active", "paused", "completed"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-bold capitalize",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Plus size={24} />}
          title="No virtual SIPs yet"
          description="Create a recurring plan to simulate buys at live market prices."
          actionLabel="Create SIP"
          onAction={() => {
            setEditing(null);
            setShowModal(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((plan) => {
            const pos = positions.find((p) => p.quoteKey === plan.quoteKey);
            const pnl = pos?.profit ?? 0;
            return (
              <div key={plan.id} className="bento-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="text-left min-w-0"
                    onClick={() => onSelectSip?.(plan.id)}
                  >
                    <div className="font-bold text-sm line-clamp-1">{plan.assetName}</div>
                    <div className="text-[11px] font-mono text-muted-foreground uppercase">
                      {plan.symbol} · {plan.assetType.replace("_", " ")}
                    </div>
                  </button>
                  <StatusBadge status={plan.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-bold">Amount</div>
                    <div className="font-bold">
                      <Amount value={plan.investmentAmount} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-muted-foreground font-bold">Schedule</div>
                    <div className="font-bold">
                      {frequencyLabel(plan.frequency)} ·{" "}
                      {executionDayLabel(plan.frequency, plan.executionDay)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-bold">Next</div>
                    <div className="font-bold">{plan.nextExecutionDate}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-muted-foreground font-bold">P&L</div>
                    <div className={cn("font-bold", pnl >= 0 ? gainClass : lossClass)}>
                      <Amount value={pnl} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
                  {plan.status === "active" && (
                    <IconBtn title="Pause" onClick={() => void setStatus(plan.id, "paused")}>
                      <Pause size={14} />
                    </IconBtn>
                  )}
                  {plan.status === "paused" && (
                    <IconBtn title="Resume" onClick={() => void setStatus(plan.id, "active")}>
                      <Play size={14} />
                    </IconBtn>
                  )}
                  <IconBtn
                    title="Execute now"
                    onClick={() => void executeNow(plan)}
                  >
                    <Zap size={14} />
                  </IconBtn>
                  <IconBtn title="Skip next" onClick={() => void skipNext(plan.id)}>
                    <SkipForward size={14} />
                  </IconBtn>
                  <IconBtn
                    title="Edit"
                    onClick={() => {
                      setEditing(plan);
                      setShowModal(true);
                    }}
                  >
                    <Pencil size={14} />
                  </IconBtn>
                  <IconBtn
                    title="Delete"
                    onClick={() => {
                      if (window.confirm("Delete this virtual SIP?")) void removePlan(plan.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </IconBtn>
                  <button
                    type="button"
                    className="ml-auto text-xs font-bold text-primary flex items-center gap-0.5"
                    onClick={() => onSelectSip?.(plan.id)}
                  >
                    Details <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SipAnalyticsPanel
        monthly={analytics.monthly}
        performance={analytics.performance}
        calendarDays={analytics.calendarDays}
        typeAllocation={typeAllocation}
        symbolAllocation={symbolAllocation}
        best={best}
        worst={worst}
        summary={summary}
      />

      <SipPlanModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditing(null);
        }}
        onSubmit={handleSave}
        editing={editing}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="bento-card p-4">
      <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
        {label}
      </div>
      <div className="text-lg font-black mt-1">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: SipPlan["status"] }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    paused: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-rose-500/15 text-rose-600",
  };
  return (
    <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg", styles[status])}>
      {status}
    </span>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="p-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
    >
      {children}
    </button>
  );
}
