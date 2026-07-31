import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import Amount from "./common/Amount";
import type { CryptoQuoteDTO } from "../services/cryptoService";
import { computePositionMetrics } from "../types/market";
import { cn } from "../lib/utils";

interface CryptoCardProps {
  data: CryptoQuoteDTO | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  quantity?: number;
  averageBuyPrice?: number;
}

export default function CryptoCard({
  data,
  loading = false,
  error = null,
  onRefresh,
  quantity,
  averageBuyPrice,
}: CryptoCardProps) {
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
          <span>Failed to load crypto data</span>
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

  const isPositive = data.changePercent24h >= 0;
  const hasPosition = quantity != null && averageBuyPrice != null && quantity > 0;
  const metrics = hasPosition ? computePositionMetrics(data.price, quantity, averageBuyPrice) : null;
  const isPosProfit = (metrics?.profitLoss ?? 0) >= 0;
  const currencySymbol = data.currency === "USD" ? "$" : "₹";

  return (
    <div className="bento-card p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-bold text-base text-foreground leading-snug">{data.name}</h4>
          <span className="text-xs font-mono font-medium text-muted-foreground uppercase">
            {data.symbol} · {data.coinId}
          </span>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all"
            title="Refresh price"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      <div>
        <div className="text-[10px] font-bold uppercase text-muted-foreground">Current Price</div>
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
            {data.change24h.toFixed(2)} ({isPositive ? "+" : ""}
            {data.changePercent24h.toFixed(2)}%)
          </span>
          <span className="text-[10px] text-muted-foreground font-normal ml-1">24h</span>
        </div>
      </div>

      {metrics && (
        <div className="rounded-xl bg-muted/40 border border-border/50 p-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Quantity</span>
            <div className="font-bold text-foreground">{quantity}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Invested</span>
            <div className="font-bold text-foreground">
              <Amount value={metrics.investedValue} prefix={currencySymbol} />
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Current Value</span>
            <div className="font-bold text-foreground">
              <Amount value={metrics.currentValue} prefix={currencySymbol} />
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
              <Amount value={metrics.profitLoss} prefix={currencySymbol} /> ({isPosProfit ? "+" : ""}
              {metrics.returnPercent.toFixed(2)}%)
            </div>
          </div>
        </div>
      )}

      {data.marketCap > 0 && (
        <div className="text-[11px] border-t border-border/50 pt-3">
          <span className="text-muted-foreground font-medium">Market Cap</span>
          <div className="font-bold text-foreground">
            <Amount value={data.marketCap} prefix={currencySymbol} />
          </div>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground text-right pt-1 border-t border-border/30">
        Updated: {new Date(data.lastUpdated).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
      </div>
    </div>
  );
}
