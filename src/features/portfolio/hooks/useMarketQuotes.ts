import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  fetchQuotes,
  fetchQuotesForHoldings,
  MARKET_DATA_REFETCH_INTERVAL,
  MARKET_DATA_STALE_TIME,
  MarketDataRateLimitError,
  SEARCH_MIN_QUERY_LENGTH,
  searchSymbols,
} from "../services/marketDataService";
import type { Holding, MarketQuote } from "../types";
import { enrichHolding } from "../services/portfolioCalculations";
import type { HoldingWithMetrics } from "../types";
import { cryptoQuoteKey, mfQuoteKey } from "../../../types/market";

export function useMarketSearch(query: string, enabled = true) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["market-search", trimmed.toUpperCase()],
    queryFn: () => searchSymbols(trimmed),
    enabled: enabled && trimmed.length >= 1,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (count, error) => {
      if (error instanceof MarketDataRateLimitError) return count < 1;
      return count < 2;
    },
    retryDelay: 3000,
  });
}

export function useMarketQuotes(yahooSymbols: string[]) {
  const stableKey = useMemo(
    () => [...new Set(yahooSymbols.filter(Boolean))].sort().join(","),
    [yahooSymbols]
  );

  return useQuery({
    queryKey: ["market-quotes", stableKey],
    queryFn: async () => {
      try {
        return await fetchQuotes(yahooSymbols);
      } catch (err) {
        console.warn("Quote fetch failed, using cost basis:", err);
        return new Map<string, MarketQuote>();
      }
    },
    enabled: yahooSymbols.length > 0,
    staleTime: MARKET_DATA_STALE_TIME,
    refetchInterval: MARKET_DATA_REFETCH_INTERVAL,
    retry: (count, error) => {
      if (error instanceof MarketDataRateLimitError) return count < 1;
      return count < 1;
    },
    retryDelay: 3000,
  });
}

function holdingQuoteKey(h: Holding): string {
  if (h.instrumentType === "mutual_fund") {
    return h.yahooSymbol?.startsWith("MF:") ? h.yahooSymbol : mfQuoteKey(h.symbol);
  }
  if (h.instrumentType === "crypto") {
    return h.yahooSymbol?.startsWith("CRYPTO:") ? h.yahooSymbol : cryptoQuoteKey(h.symbol);
  }
  return h.yahooSymbol || h.symbol;
}

export function useHoldingsWithMetrics(holdings: Holding[]) {
  const holdingsKey = useMemo(
    () =>
      holdings
        .map((h) => `${h.id}:${holdingQuoteKey(h)}:${h.instrumentType}`)
        .sort()
        .join("|"),
    [holdings]
  );

  const { data: quotesMap, isLoading, isFetching, dataUpdatedAt, error } = useQuery({
    queryKey: ["holdings-quotes", holdingsKey],
    queryFn: async () => {
      try {
        return await fetchQuotesForHoldings(holdings);
      } catch (err) {
        console.warn("Holdings quote fetch failed, using cost basis:", err);
        return new Map<string, MarketQuote>();
      }
    },
    enabled: holdings.length > 0,
    staleTime: MARKET_DATA_STALE_TIME,
    refetchInterval: MARKET_DATA_REFETCH_INTERVAL,
    retry: (count, err) => {
      if (err instanceof MarketDataRateLimitError) return count < 1;
      return count < 1;
    },
    retryDelay: 3000,
  });

  const enriched: HoldingWithMetrics[] = useMemo(() => {
    return holdings.map((h) => {
      const key = holdingQuoteKey(h);
      const quote = quotesMap?.get(key) ?? quotesMap?.get(h.yahooSymbol);
      return enrichHolding(h, quote);
    });
  }, [holdings, quotesMap]);

  return {
    holdingsWithMetrics: enriched,
    quotesMap: quotesMap ?? new Map<string, MarketQuote>(),
    quotesLoading: isLoading,
    isRefreshing: isFetching && !isLoading,
    lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
    error,
  };
}

export { SEARCH_MIN_QUERY_LENGTH };
