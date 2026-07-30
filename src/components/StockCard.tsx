import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import Amount from "./common/Amount";
import type { YahooStockResponse } from "../services/stockService";
import { cn } from "../lib/utils";

interface StockCardProps {
  data: YahooStockResponse | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  units?: number;
  averageBuyPrice?: number;
}

export default function StockCard({
  data,
  loading = false,
  error = null,
  onRefresh,
  units,
  averageBuyPrice,
}: StockCardProps) {
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
          <span>Failed to load stock data</span>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{error || "No data available"}</p>
      </div>
    );
  }

  const isPositive = data.change >= 0;
  const hasPosition = units != null && averageBuyPrice != null && units > 0;
  const currencySymbol = data.currency === "USD" ? "$" : "₹";

  const currentValue = hasPosition ? units * data.price : 0;
  const investedValue = hasPosition ? units * averageBuyPrice : 0;
  const profitLoss = hasPosition ? currentValue - investedValue : 0;
  const profitLossPercent = hasPosition && investedValue > 0 ? (profitLoss / investedValue) * 100 : 0;
  const isPosProfit = profitLoss >= 0;

  return (
    <div className="bento-card p-5 space-y-4">
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-bold text-base text-foreground leading-snug">{data.name}</h4>
          <span className="text-xs font-mono font-medium text-muted-foreground uppercase">
            {data.symbol} · {data.exchange}
          </span>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all"
            title="Refresh quote"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {/* Main Price & Day Change */}
      <div className="flex items-baseline justify-between pt-1">
        <div>
          <div className="text-2xl font-black tracking-tight text-foreground">
            <Amount value={data.price} prefix={currencySymbol} />
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
              {data.change.toFixed(2)} ({isPositive ? "+" : ""}
              {data.changePercent.toFixed(2)}%)
            </span>
            <span className="text-[10px] text-muted-foreground font-normal ml-1">Today</span>
          </div>
        </div>
      </div>

      {/* Portfolio Position Metrics (if units/avgBuyPrice supplied) */}
      {hasPosition && (
        <div className="rounded-xl bg-muted/40 border border-border/50 p-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Invested ({units} qty)</span>
            <div className="font-bold text-foreground">
              <Amount value={investedValue} prefix={currencySymbol} />
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">P&L</span>
            <div
              className={cn(
                "font-bold",
                isPosProfit ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
              )}
            >
              {isPosProfit ? "+" : ""}
              <Amount value={profitLoss} prefix={currencySymbol} /> ({isPosProfit ? "+" : ""}
              {profitLossPercent.toFixed(2)}%)
            </div>
          </div>
        </div>
      )}

      {/* High / Low / Previous Close */}
      <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-3 text-[11px]">
        <div>
          <span className="text-muted-foreground font-medium block">Prev Close</span>
          <span className="font-bold text-foreground">
            <Amount value={data.previousClose} prefix={currencySymbol} />
          </span>
        </div>
        <div>
          <span className="text-muted-foreground font-medium block">Day High</span>
          <span className="font-bold text-emerald-500 dark:text-emerald-400">
            <Amount value={data.dayHigh} prefix={currencySymbol} />
          </span>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground font-medium block">Day Low</span>
          <span className="font-bold text-rose-500 dark:text-rose-400">
            <Amount value={data.dayLow} prefix={currencySymbol} />
          </span>
        </div>
      </div>

      {/* Footer Timestamp */}
      <div className="text-[10px] text-muted-foreground text-right pt-1 border-t border-border/30">
        Updated: {new Date(data.marketTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}
