import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import Amount from "./common/Amount";
import type { MutualFundQuoteDTO } from "../services/mutualFundService";
import { computePositionMetrics } from "../types/market";
import { cn } from "../lib/utils";

interface MutualFundCardProps {
  data: MutualFundQuoteDTO | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  units?: number;
  averageNAV?: number;
}

export default function MutualFundCard({
  data,
  loading = false,
  error = null,
  onRefresh,
  units,
  averageNAV,
}: MutualFundCardProps) {
  if (loading) {
    return (
      <div className="bento-card p-5 animate-pulse space-y-3">
        <div className="h-4 w-1/3 bg-muted rounded" />
        <div className="h-8 w-1/2 bg-muted rounded" />
        <div className="h-3 w-1/4 bg-muted rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bento-card p-5 space-y-2 border-red-500/20 bg-red-500/5">
        <div className="flex items-center justify-between text-xs font-bold text-red-500">
          <span>Failed to load fund data</span>
          {onRefresh && (
            <button type="button" onClick={onRefresh} className="p-1 hover:bg-muted/50 rounded-lg transition-colors">
              <RefreshCw size={14} />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{error || "No data available"}</p>
      </div>
    );
  }

  const isPositive = data.change >= 0;
  const hasPosition = units != null && averageNAV != null && units > 0;
  const metrics = hasPosition ? computePositionMetrics(data.nav, units, averageNAV) : null;
  const isPosProfit = (metrics?.profitLoss ?? 0) >= 0;

  return (
    <div className="bento-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-base text-foreground leading-snug line-clamp-2">{data.schemeName}</h4>
          <span className="text-xs font-mono font-medium text-muted-foreground">
            {data.schemeCode}
            {data.fundHouse ? ` · ${data.fundHouse}` : ""}
          </span>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all shrink-0"
            title="Refresh NAV"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      <div>
        <div className="text-[10px] font-bold uppercase text-muted-foreground">Current NAV</div>
        <div className="text-2xl font-black tracking-tight text-foreground">
          <Amount value={data.nav} prefix="₹" />
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-bold mt-1",
            isPositive ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
          )}
        >
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>
            {isPositive ? "+" : ""}
            {data.change.toFixed(4)} ({isPositive ? "+" : ""}
            {data.changePercent.toFixed(2)}%)
          </span>
          <span className="text-[10px] text-muted-foreground font-normal ml-1">vs prev</span>
        </div>
      </div>

      {metrics && (
        <div className="rounded-xl bg-muted/40 border border-border/50 p-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Quantity</span>
            <div className="font-bold text-foreground">{units}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Invested</span>
            <div className="font-bold text-foreground">
              <Amount value={metrics.investedValue} prefix="₹" />
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Current Value</span>
            <div className="font-bold text-foreground">
              <Amount value={metrics.currentValue} prefix="₹" />
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">P&L / Return</span>
            <div
              className={cn(
                "font-bold",
                isPosProfit ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
              )}
            >
              {isPosProfit ? "+" : ""}
              <Amount value={metrics.profitLoss} prefix="₹" /> ({isPosProfit ? "+" : ""}
              {metrics.returnPercent.toFixed(2)}%)
            </div>
          </div>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground text-right pt-1 border-t border-border/30">
        NAV date: {data.date}
      </div>
    </div>
  );
}
