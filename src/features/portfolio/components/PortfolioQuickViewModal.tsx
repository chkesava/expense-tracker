import { ArrowUpRight, Plus, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import Modal from "../../../components/common/Modal";
import Amount from "../../../components/common/Amount";
import Button from "../../../components/ui/Button";
import type { HoldingWithMetrics, PortfolioSummary } from "../types";
import { cn } from "../../../lib/utils";
import { gainClass, lossClass } from "../utils/styles";

interface PortfolioQuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPortfolio: () => void;
  onAddHolding: () => void;
  holdings: HoldingWithMetrics[];
  summary: PortfolioSummary;
  loading?: boolean;
  isRefreshing?: boolean;
  lastUpdated?: Date | null;
}

export default function PortfolioQuickViewModal({
  isOpen,
  onClose,
  onOpenPortfolio,
  onAddHolding,
  holdings,
  summary,
  loading,
  isRefreshing,
  lastUpdated,
}: PortfolioQuickViewModalProps) {
  const positive = summary.overallGainLoss >= 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Investment Portfolio" className="sm:max-w-2xl">
      <div className="space-y-5">
        <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Current value</p>
              <Amount value={summary.portfolioValue} className="mt-2 block text-3xl font-black" />
              <div className={cn("mt-2 flex items-center gap-1 text-sm font-bold", positive ? gainClass : lossClass)}>
                {positive ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                {positive ? "+" : "−"}<Amount value={Math.abs(summary.overallGainLoss)} showBlur={false} /> overall
              </div>
            </div>
            <div className="rounded-2xl bg-background/60 px-3 py-2 text-right text-xs text-muted-foreground backdrop-blur">
              <div className="font-bold text-foreground">{holdings.length} holding{holdings.length === 1 ? "" : "s"}</div>
              <div className="mt-1 flex items-center justify-end gap-1">
                <RefreshCw size={11} className={cn(isRefreshing && "animate-spin")} />
                {lastUpdated ? lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "15 min refresh"}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((index) => <div key={index} className="h-14 animate-pulse rounded-2xl bg-muted/60" />)}
          </div>
        ) : holdings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Start tracking your portfolio with your first stock or ETF purchase.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            {holdings.slice(0, 4).map((holding) => {
              const holdingPositive = holding.profit >= 0;
              return (
                <div key={holding.id} className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 last:border-0">
                  <div>
                    <div className="font-black">{holding.symbol}</div>
                    <div className="text-xs text-muted-foreground">{holding.quantity} units · <Amount value={holding.currentPrice} showBlur={false} /></div>
                  </div>
                  <div className={cn("text-right text-sm font-bold", holdingPositive ? gainClass : lossClass)}>
                    {holdingPositive ? "+" : "−"}<Amount value={Math.abs(holding.profit)} showBlur={false} />
                    <div className="text-[10px]">{holding.hasLiveQuote ? "Live price" : "Cost basis"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={onAddHolding} icon={<Plus size={16} />}>Add Holding</Button>
          <Button variant="secondary" onClick={onOpenPortfolio} icon={<ArrowUpRight size={16} />}>Open Portfolio</Button>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">Tracking only — no orders are placed from this app.</p>
      </div>
    </Modal>
  );
}
