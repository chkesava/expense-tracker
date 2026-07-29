import { Star, Trash2 } from "lucide-react";
import { useWatchlist } from "../hooks/useWatchlist";
import { useMarketQuotes } from "../hooks/useMarketQuotes";
import Amount from "../../../components/common/Amount";
import { cn } from "../../../lib/utils";
import { formatPercent, gainClass, lossClass } from "../utils/styles";
import PortfolioSkeleton from "./PortfolioSkeleton";

export default function WatchlistPanel() {
  const { items, loading, removeFromWatchlist } = useWatchlist();
  const { data: quotes, isLoading: quotesLoading } = useMarketQuotes(
    items.map((i) => i.yahooSymbol)
  );

  if (loading) return <PortfolioSkeleton />;

  if (items.length === 0) {
    return (
      <div className="bento-card p-8 text-center text-muted-foreground">
        <Star className="mx-auto mb-2 opacity-50" size={24} />
        <p>Your watchlist is empty. Search and add symbols to track.</p>
      </div>
    );
  }

  return (
    <div className="bento-card divide-y divide-border overflow-hidden">
      {items.map((item) => {
        const quote = quotes?.get(item.yahooSymbol);
        const positive = (quote?.dayChangePercent ?? 0) >= 0;
        return (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          >
            <div>
              <div className="font-bold">{item.symbol}</div>
              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                {item.name}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {quotesLoading && !quote ? (
                <span className="text-xs text-muted-foreground">...</span>
              ) : quote ? (
                <div className="text-right">
                  <Amount value={quote.currentPrice} className="font-bold" />
                  <div className={cn("text-xs font-semibold", positive ? gainClass : lossClass)}>
                    {formatPercent(quote.dayChangePercent)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    52W: <Amount value={quote.fiftyTwoWeekLow} /> –{" "}
                    <Amount value={quote.fiftyTwoWeekHigh} />
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">N/A</span>
              )}
              <button
                onClick={() => removeFromWatchlist(item.id)}
                className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
