import { memo, useState } from "react";
import { Edit2, Trash2, History, ShoppingCart, TrendingDown } from "lucide-react";
import Amount from "../../../components/common/Amount";
import type { HoldingWithMetrics } from "../types";
import { cn } from "../../../lib/utils";
import { formatPercent, gainClass, lossClass } from "../utils/styles";
import ConfirmDialog from "../../../components/common/ConfirmDialog";

interface HoldingsTableProps {
  holdings: HoldingWithMetrics[];
  onEdit: (holding: HoldingWithMetrics) => void;
  onDelete: (id: string) => void;
  onViewHistory: (holding: HoldingWithMetrics) => void;
  onMockBuy: (holding: HoldingWithMetrics) => void;
  onMockSell: (holding: HoldingWithMetrics) => void;
}

function HoldingsTable({
  holdings,
  onEdit,
  onDelete,
  onViewHistory,
  onMockBuy,
  onMockSell,
}: HoldingsTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (holdings.length === 0) {
    return (
      <div className="bento-card p-12 text-center text-muted-foreground">
        No holdings yet. Add your first holding to get started.
      </div>
    );
  }

  return (
    <>
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-4 font-bold">Company</th>
                <th className="p-4 font-bold hidden sm:table-cell">Qty</th>
                <th className="p-4 font-bold hidden md:table-cell">Avg Price</th>
                <th className="p-4 font-bold">LTP</th>
                <th className="p-4 font-bold hidden lg:table-cell">Invested</th>
                <th className="p-4 font-bold">Current</th>
                <th className="p-4 font-bold">P&L</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const positive = h.profit >= 0;
                return (
                  <tr
                    key={h.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xs font-black text-emerald-600">
                          {h.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold">{h.symbol}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {h.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell font-medium">{h.quantity}</td>
                    <td className="p-4 hidden md:table-cell">
                      <Amount value={h.averageBuyPrice} />
                    </td>
                    <td className="p-4 font-medium">
                      <Amount value={h.currentPrice} />
                      {h.targetPrice && (
                        <div className="text-[10px] text-muted-foreground">
                          Target <Amount value={h.targetPrice} showBlur={false} />
                        </div>
                      )}
                      {!h.hasLiveQuote && (
                        <div className="text-[10px] text-amber-600 font-semibold">Avg price</div>
                      )}
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <Amount value={h.investedValue} />
                    </td>
                    <td className="p-4 font-bold">
                      <Amount value={h.currentValue} />
                    </td>
                    <td className="p-4">
                      <div className={cn("font-bold", positive ? gainClass : lossClass)}>
                        {h.profit >= 0 ? "+" : "−"}
                        <Amount value={Math.abs(h.profit)} />
                      </div>
                      <div className={cn("text-xs", positive ? gainClass : lossClass)}>
                        {formatPercent(h.profitPercent)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onMockBuy(h)}
                          className="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-500"
                          title="Mock Buy"
                        >
                          <ShoppingCart size={16} />
                        </button>
                        <button
                          onClick={() => onMockSell(h)}
                          className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-500"
                          title="Mock Sell"
                        >
                          <TrendingDown size={16} />
                        </button>
                        <button
                          onClick={() => onViewHistory(h)}
                          className="p-2 rounded-lg hover:bg-muted"
                          title="History"
                        >
                          <History size={16} />
                        </button>
                        <button
                          onClick={() => onEdit(h)}
                          className="p-2 rounded-lg hover:bg-muted"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteId(h.id)}
                          className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-500"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) onDelete(deleteId);
          setDeleteId(null);
        }}
        title="Delete Holding"
        message="This will remove the holding from your portfolio. Transaction history will remain."
        confirmText="Delete"
      />
    </>
  );
}

export default memo(HoldingsTable);
