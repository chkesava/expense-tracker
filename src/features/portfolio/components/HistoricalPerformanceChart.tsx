import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { History, RefreshCw } from "lucide-react";
import type { PortfolioSnapshot } from "../types";
import { cn } from "../../../lib/utils";
import Button from "../../../components/ui/Button";

interface HistoricalPerformanceChartProps {
  snapshots: PortfolioSnapshot[];
  onSyncHistory: () => void;
  isSyncing: boolean;
}

type TimeScale = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

const TIME_SCALES: { id: TimeScale; label: string; days: number }[] = [
  { id: "1W", label: "1W", days: 7 },
  { id: "1M", label: "1M", days: 30 },
  { id: "3M", label: "3M", days: 90 },
  { id: "6M", label: "6M", days: 180 },
  { id: "1Y", label: "1Y", days: 365 },
  { id: "ALL", label: "All", days: 99999 },
];

export default function HistoricalPerformanceChart({
  snapshots,
  onSyncHistory,
  isSyncing,
}: HistoricalPerformanceChartProps) {
  const [scale, setScale] = useState<TimeScale>("1M");

  const filteredData = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [];
    
    // snapshots are usually sorted descending from the API, but let's ensure chronological for the chart
    const chronological = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
    
    const days = TIME_SCALES.find((t) => t.id === scale)?.days || 30;
    
    if (days >= chronological.length) return chronological;
    
    return chronological.slice(-days);
  }, [snapshots, scale]);

  const latest = filteredData[filteredData.length - 1];
  const isPositive = latest ? latest.profit >= 0 : true;

  const chartColor = isPositive ? "#00D09C" : "#F43F5E";

  if (snapshots.length < 2) {
    return (
      <div className="bento-card p-8 flex flex-col items-center justify-center text-center space-y-4 border border-dashed border-muted-foreground/30 bg-muted/10">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <History size={32} />
        </div>
        <div>
          <h3 className="text-lg font-bold">Historical Performance</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
            You don't have enough daily snapshots to display a historical graph yet.
          </p>
        </div>
        <Button onClick={() => onSyncHistory()} disabled={isSyncing} icon={<RefreshCw size={16} className={cn(isSyncing && "animate-spin")} />}>
          {isSyncing ? "Syncing History..." : "Sync Past 90 Days"}
        </Button>
      </div>
    );
  }

  return (
    <div className="bento-card p-5 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Portfolio Performance
          </h3>
          {latest && (
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black tracking-tight">
                ₹{latest.portfolioValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </span>
              <div className={cn("text-sm font-bold flex items-center gap-1", isPositive ? "text-emerald-500" : "text-rose-500")}>
                {isPositive ? "+" : ""}
                ₹{latest.profit.toLocaleString("en-IN", { maximumFractionDigits: 2 })} 
                ({isPositive ? "+" : ""}{latest.profitPercent.toFixed(2)}%)
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg self-start sm:self-auto">
          {TIME_SCALES.map((t) => (
            <button
              key={t.id}
              onClick={() => setScale(t.id)}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-md transition-colors",
                scale === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11 }} 
              tickFormatter={(val) => {
                const [, month, day] = val.split("-");
                return `${day}/${month}`;
              }}
              axisLine={false}
              tickLine={false}
              dy={10}
              minTickGap={20}
            />
            <YAxis 
              tick={{ fontSize: 11 }} 
              axisLine={false}
              tickLine={false}
              dx={-10}
              tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              labelFormatter={(label) => `Date: ${label}`}
              formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`, "Portfolio Value"]}
            />
            <Area
              type="monotone"
              dataKey="portfolioValue"
              stroke={chartColor}
              strokeWidth={3}
              fill="url(#colorValue)"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {snapshots.length < 30 && (
         <div className="text-right">
             <Button variant="ghost" onClick={() => onSyncHistory()} disabled={isSyncing} className="text-xs">
                {isSyncing ? "Syncing..." : "Sync Missing History"}
             </Button>
         </div>
      )}
    </div>
  );
}
