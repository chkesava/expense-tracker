import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import type { PortfolioSnapshot } from "../types";
import type { PortfolioTransaction } from "../types";
import { chartAxisTick, chartTokens, chartTooltipStyle } from "../../../utils/chartColors";

interface PortfolioChartsProps {
  snapshots: PortfolioSnapshot[];
  transactions: PortfolioTransaction[];
}

export default function PortfolioCharts({
  snapshots,
  transactions,
}: PortfolioChartsProps) {
  const tokens = chartTokens();
  const tip = chartTooltipStyle(tokens);
  const tick = chartAxisTick(tokens);

  const growthData = snapshots.map((s) => ({
    date: s.date.slice(5),
    value: s.portfolioValue,
    invested: s.investedValue,
    profit: s.profit,
  }));

  const monthlyInvestments = transactions
    .filter((t) => t.type === "BUY" && t.orderStatus === "executed")
    .reduce<Record<string, number>>((acc, t) => {
      const month = t.date.slice(0, 7);
      acc[month] = (acc[month] ?? 0) + t.quantity * t.price;
      return acc;
    }, {});

  const monthlyData = Object.entries(monthlyInvestments)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({
      month: month.slice(5),
      amount,
    }));

  const dividendData = transactions
    .filter((t) => t.type === "DIVIDEND")
    .reduce<Record<string, number>>((acc, t) => {
      const month = t.date.slice(0, 7);
      acc[month] = (acc[month] ?? 0) + t.quantity * t.price;
      return acc;
    }, {});

  const dividendChart = Object.entries(dividendData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month: month.slice(5), amount }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="bento-card space-y-4 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Investment vs Current Value
        </h3>
        {growthData.length < 1 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
            <BarChart data={growthData.slice(-6)}>
              <CartesianGrid strokeDasharray="3 3" stroke={tokens.border} opacity={0.6} />
              <XAxis dataKey="date" tick={tick} />
              <YAxis tick={tick} />
              <Tooltip contentStyle={tip} />
              <Legend />
              <Bar dataKey="invested" fill={tokens.primary} name="Invested" radius={[4, 4, 0, 0]} />
              <Bar dataKey="value" fill={tokens.success} name="Current" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bento-card space-y-4 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Monthly Investment
        </h3>
        {monthlyData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No buy transactions</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={tick} />
              <YAxis tick={tick} />
              <Tooltip contentStyle={tip} />
              <Bar dataKey="amount" fill={tokens.success} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bento-card space-y-4 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Dividend Income
        </h3>
        {dividendChart.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No dividends recorded</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dividendChart}>
              <XAxis dataKey="month" tick={tick} />
              <YAxis tick={tick} />
              <Tooltip contentStyle={tip} />
              <Bar dataKey="amount" fill={tokens.warning} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
