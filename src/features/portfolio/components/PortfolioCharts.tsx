import {
  AreaChart,
  Area,
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

interface PortfolioChartsProps {
  snapshots: PortfolioSnapshot[];
  transactions: PortfolioTransaction[];
}

export default function PortfolioCharts({
  snapshots,
  transactions,
}: PortfolioChartsProps) {
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <div className="bento-card p-5 space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
          Investment vs Current Value
        </h3>
        {growthData.length < 1 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
            <BarChart data={growthData.slice(-6)}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="invested" fill="#5367FF" name="Invested" radius={[4, 4, 0, 0]} />
              <Bar dataKey="value" fill="#00D09C" name="Current" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bento-card p-5 space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
          Monthly Investment
        </h3>
        {monthlyData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No buy transactions</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="amount" fill="#00D09C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bento-card p-5 space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
          Dividend Income
        </h3>
        {dividendChart.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No dividends recorded</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dividendChart}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="amount" fill="#FFB020" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
