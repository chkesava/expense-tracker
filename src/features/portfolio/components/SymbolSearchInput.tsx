import { useEffect, useRef, useState } from "react";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { useMarketSearch } from "../hooks/useMarketQuotes";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { MarketDataRateLimitError } from "../services/marketDataService";
import type { SearchResult } from "../types";
import { cn } from "../../../lib/utils";
import { fieldClass } from "../utils/styles";

interface SymbolSearchInputProps {
  value: string;
  onSelect: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

export default function SymbolSearchInput({
  value,
  onSelect,
  placeholder = "Search RELIANCE, TCS, NIFTYBEES...",
  className,
}: SymbolSearchInputProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebouncedValue(query, 500);
  const { data: results = [], isFetching, error } = useMarketSearch(debouncedQuery, open);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isRateLimited = error instanceof MarketDataRateLimitError;
  const showDropdown = open && query.trim().length >= 1;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn(fieldClass, "pl-10")}
        />
        {isFetching && (
          <Loader2
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        )}
      </div>

      {showDropdown && (
        <ul className="absolute z-50 mt-2 w-full max-h-60 overflow-y-auto rounded-2xl border border-border bg-background shadow-xl">
          {isRateLimited && (
            <li className="px-4 py-3 text-sm text-amber-600 flex items-center gap-2">
              <AlertCircle size={14} />
              Twelve Data rate limit — showing local matches. Wait a few seconds.
            </li>
          )}
          {results.length === 0 && !isFetching && !isRateLimited && (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              {query.trim().length < 2
                ? "Type 2+ characters for broader search"
                : "No results"}
            </li>
          )}
          {results.map((r) => (
            <li key={r.yahooSymbol}>
              <button
                type="button"
                className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                onClick={() => {
                  onSelect(r);
                  setQuery(r.symbol);
                  setOpen(false);
                }}
              >
                <div className="font-bold text-sm">{r.symbol}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.name} · {r.exchange} · {r.instrumentType.toUpperCase()}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
