import { TrendingUp, TrendingDown } from "lucide-react";
import Amount from "../../../components/common/Amount";
import type { HoldingWithMetrics } from "../types";
import { cn } from "../../../lib/utils";

interface HoldingCardsGridProps {
  holdings: HoldingWithMetrics[];
}

function HoldingCard({ holding }: { holding: HoldingWithMetrics }) {
  const dayPositive = holding.dayChange >= 0;
  const pnlPositive = holding.profit >= 0;
  const priceLabel =
    holding.instrumentType === "mutual_fund"
      ? "NAV"
      : "Price";
  const idLabel =
    holding.instrumentType === "mutual_fund"
      ? holding.symbol
      : holding.instrumentType === "crypto"
        ? holding.symbol
        : holding.yahooSymbol || holding.symbol;

  return (
    <div className="bento-card p-5 space-y-3">
      <div>
        <h4 className="font-bold text-sm text-foreground leading-snug line-clamp-2">{holding.name}</h4>
        <span className="text-[11px] font-mono text-muted-foreground uppercase">{idLabel}</span>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase text-muted-foreground">{priceLabel}</div>
          <div className="text-xl font-black">
            <Amount value={holding.currentPrice} />
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-bold",
            dayPositive ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
          )}
        >
          {dayPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {dayPositive ? "+" : ""}
          {holding.dayChangePercent.toFixed(2)}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs rounded-xl bg-muted/40 border border-border/50 p-3">
        <div>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Qty</span>
          <div className="font-bold">{holding.quantity}</div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Invested</span>
          <div className="font-bold">
            <Amount value={holding.investedValue} />
          </div>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Current</span>
          <div className="font-bold">
            <Amount value={holding.currentValue} />
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">P&L</span>
          <div
            className={cn(
              "font-bold",
              pnlPositive ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
            )}
          >
            {pnlPositive ? "+" : ""}
            <Amount value={holding.profit} /> ({pnlPositive ? "+" : ""}
            {holding.profitPercent.toFixed(2)}%)
          </div>
        </div>
      </div>

      {!holding.hasLiveQuote && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400">Using cost basis · live quote unavailable</p>
      )}
    </div>
  );
}

export default function HoldingCardsGrid({ holdings }: HoldingCardsGridProps) {
  if (holdings.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {holdings.map((h) => (
        <HoldingCard key={h.id} holding={h} />
      ))}
    </div>
  );
}
