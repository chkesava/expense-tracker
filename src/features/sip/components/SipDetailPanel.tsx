import { ArrowLeft, Zap } from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import Amount from "../../../components/common/Amount";
import Button from "../../../components/ui/Button";
import { cn } from "../../../lib/utils";
import { useSipPlans } from "../hooks/useSipPlans";
import { useSipTransactions } from "../hooks/useSipTransactions";
import { useVirtualPortfolio } from "../hooks/useVirtualPortfolio";
import { useSipExecutor } from "../hooks/useSipExecutor";
import { useSipAnalytics } from "../hooks/useSipAnalytics";
import {
  executionDayLabel,
  frequencyLabel,
} from "../services/sipSchedule";
import { gainClass, lossClass } from "../../portfolio/utils/styles";

interface SipDetailPanelProps {
  sipId: string;
  onBack: () => void;
}

export default function SipDetailPanel({ sipId, onBack }: SipDetailPanelProps) {
  const { plans } = useSipPlans();
  const plan = plans.find((p) => p.id === sipId) ?? null;
  const { transactions, executed, loading } = useSipTransactions(sipId);
  const { positions } = useVirtualPortfolio(plans);
  const { executeNow } = useSipExecutor(plans);
  const { performance } = useSipAnalytics(executed, positions);

  if (!plan) {
    return (
      <div className="bento-card p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">SIP not found</p>
        <Button variant="secondary" onClick={onBack} icon={<ArrowLeft size={16} />}>
          Back
        </Button>
      </div>
    );
  }

  const pos = positions.find((p) => p.quoteKey === plan.quoteKey);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} icon={<ArrowLeft size={16} />}>
            Back
          </Button>
          <div>
            <h2 className="text-lg font-bold">{plan.assetName}</h2>
            <p className="text-xs text-muted-foreground font-mono uppercase">
              {plan.symbol} · Virtual SIP
            </p>
          </div>
        </div>
        <Button onClick={() => void executeNow(plan)} icon={<Zap size={16} />}>
          Execute Now
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Total Units" value={plan.totalUnits.toFixed(4)} />
        <Metric
          label="Avg Buy"
          value={<Amount value={pos?.averageBuyPrice ?? (plan.totalUnits > 0 ? plan.totalInvested / plan.totalUnits : 0)} />}
        />
        <Metric label="Invested" value={<Amount value={plan.totalInvested} />} />
        <Metric
          label="Market Value"
          value={
            <span className={cn((pos?.profit ?? 0) >= 0 ? gainClass : lossClass)}>
              <Amount value={pos?.currentValue ?? 0} />
            </span>
          }
        />
      </div>

      <div className="bento-card p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground font-bold">Schedule</div>
          <div className="font-bold">
            {frequencyLabel(plan.frequency)} · {executionDayLabel(plan.frequency, plan.executionDay)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground font-bold">Next Execution</div>
          <div className="font-bold">{plan.nextExecutionDate}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground font-bold">Last Execution</div>
          <div className="font-bold">{plan.lastExecutionDate ?? "—"}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground font-bold">Return</div>
          <div className={cn("font-bold", (pos?.profitPercent ?? 0) >= 0 ? gainClass : lossClass)}>
            {(pos?.profitPercent ?? 0).toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="bento-card p-4">
        <h3 className="font-bold text-sm mb-3">Performance</h3>
        {performance.length < 2 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            Performance chart appears after multiple executions
          </p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="invested" stroke="#94a3b8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="value" stroke="#00D09C" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bento-card p-4">
        <h3 className="font-bold text-sm mb-3">Transaction History</h3>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : transactions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/50">
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Price</th>
                  <th className="py-2 pr-2">Amount</th>
                  <th className="py-2 pr-2">Units</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-border/30">
                    <td className="py-2 pr-2 font-mono">{t.date}</td>
                    <td className="py-2 pr-2">
                      {t.status === "executed" ? <Amount value={t.marketPrice} /> : "—"}
                    </td>
                    <td className="py-2 pr-2">
                      {t.status === "executed" ? <Amount value={t.investmentAmount} /> : "—"}
                    </td>
                    <td className="py-2 pr-2">
                      {t.status === "executed" ? t.unitsPurchased.toFixed(4) : "—"}
                    </td>
                    <td className="py-2 capitalize">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bento-card p-4">
        <h3 className="font-bold text-sm mb-3">Timeline</h3>
        <ol className="space-y-3">
          {executed.map((t) => (
            <li key={t.id} className="flex gap-3 text-xs">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
              <div>
                <div className="font-bold">{t.date}</div>
                <div className="text-muted-foreground">
                  Bought {t.unitsPurchased.toFixed(4)} units @ <Amount value={t.marketPrice} />
                </div>
              </div>
            </li>
          ))}
          {executed.length === 0 && (
            <p className="text-xs text-muted-foreground">No executions yet</p>
          )}
        </ol>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bento-card p-4">
      <div className="text-[10px] font-bold uppercase text-muted-foreground">{label}</div>
      <div className="text-base font-black mt-1">{value}</div>
    </div>
  );
}
