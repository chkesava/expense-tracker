import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Amount from "../../../components/common/Amount";
import AllocationPieChart from "../../portfolio/components/AllocationPieChart";
import { gainClass, lossClass } from "../../portfolio/utils/styles";
import type { SipPortfolioSummary, VirtualPositionWithMetrics } from "../types";
import { cn } from "../../../lib/utils";

interface SipAnalyticsPanelProps {
  monthly: { month: string; amount: number }[];
  performance: { date: string; invested: number; value: number }[];
  calendarDays: Set<string>;
  typeAllocation: { name: string; value: number; percent: number }[];
  symbolAllocation: { name: string; value: number; percent: number }[];
  best: VirtualPositionWithMetrics | null;
  worst: VirtualPositionWithMetrics | null;
  summary: SipPortfolioSummary;
}

export default function SipAnalyticsPanel({
  monthly,
  performance,
  calendarDays,
  typeAllocation,
  symbolAllocation,
  best,
  worst,
  summary,
}: SipAnalyticsPanelProps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  const typeSlices = typeAllocation.map((a, i) => ({
    id: a.name,
    label: a.name.replace("_", " "),
    value: a.value,
    percent: a.percent,
    color: ["#00D09C", "#5367FF", "#FFB020", "#FF6B6B"][i % 4],
  }));

  const symbolSlices = symbolAllocation.slice(0, 8).map((a, i) => ({
    id: a.name,
    label: a.name,
    value: a.value,
    percent: a.percent,
    color: ["#00D09C", "#5367FF", "#FFB020", "#9B59B6", "#3498DB", "#E74C3C", "#1ABC9C", "#FF6B6B"][i % 8],
  }));

  return (
    <div className="space-y-6">
      <h3 className="text-base font-bold">SIP Analytics</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bento-card p-4">
          <div className="text-sm font-bold mb-3">Monthly Investment</div>
          {monthly.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No executions yet</p>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#5367FF" radius={[6, 6, 0, 0]} name="Invested" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bento-card p-4">
          <div className="text-sm font-bold mb-3">Invested vs Value</div>
          {performance.length < 2 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Need more history</p>
          ) : (
            <div className="h-52">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AllocationPieChart data={typeSlices} title="By Asset Type" />
        <AllocationPieChart data={symbolSlices} title="By Asset" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bento-card p-4">
          <div className="text-[10px] font-bold uppercase text-muted-foreground">Current Value</div>
          <div className="text-xl font-black mt-1">
            <Amount value={summary.currentValue} />
          </div>
        </div>
        <div className="bento-card p-4">
          <div className="text-[10px] font-bold uppercase text-muted-foreground">Best Performer</div>
          <div className="font-bold mt-1 line-clamp-1">{best?.assetName ?? "—"}</div>
          {best && (
            <div className={cn("text-sm font-bold", best.profitPercent >= 0 ? gainClass : lossClass)}>
              {best.profitPercent.toFixed(2)}%
            </div>
          )}
        </div>
        <div className="bento-card p-4">
          <div className="text-[10px] font-bold uppercase text-muted-foreground">Worst Performer</div>
          <div className="font-bold mt-1 line-clamp-1">{worst?.assetName ?? "—"}</div>
          {worst && (
            <div className={cn("text-sm font-bold", worst.profitPercent >= 0 ? gainClass : lossClass)}>
              {worst.profitPercent.toFixed(2)}%
            </div>
          )}
        </div>
      </div>

      <div className="bento-card p-4">
        <div className="text-sm font-bold mb-3">Investment Calendar · {monthPrefix}</div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={`${d}-${i}`} className="font-bold">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: new Date(year, month, 1).getDay() }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const key = `${monthPrefix}-${String(day).padStart(2, "0")}`;
            const hit = calendarDays.has(key);
            return (
              <div
                key={key}
                className={cn(
                  "aspect-square rounded-lg flex items-center justify-center text-[11px] font-bold",
                  hit
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-muted-foreground"
                )}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
