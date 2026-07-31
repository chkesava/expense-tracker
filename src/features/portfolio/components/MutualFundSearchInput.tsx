import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { searchMutualFunds, type MutualFundSearchResult } from "../../../services/mutualFundService";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { fieldClass } from "../utils/styles";
import { cn } from "../../../lib/utils";

interface MutualFundSearchInputProps {
  value: string;
  onSelect: (result: MutualFundSearchResult) => void;
}

export default function MutualFundSearchInput({ value, onSelect }: MutualFundSearchInputProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<MutualFundSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(query, 350);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    const q = debounced.trim();
    if (q.length < 1) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    void searchMutualFunds(q)
      .then((list) => {
        if (!cancelled) {
          setResults(list);
          setOpen(true);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResults([]);
          setError(err instanceof Error ? err.message : "Search failed");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search by fund name or scheme code"
          className={cn(fieldClass, "pl-9")}
          autoComplete="off"
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-card shadow-lg">
          {results.map((item) => (
            <li key={item.schemeCode}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/60"
                onClick={() => {
                  onSelect(item);
                  setQuery(item.schemeName);
                  setOpen(false);
                }}
              >
                <div className="font-medium text-foreground line-clamp-2">{item.schemeName}</div>
                <div className="text-[11px] font-mono text-muted-foreground">{item.schemeCode}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
