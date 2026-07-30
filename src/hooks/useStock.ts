import { useState, useEffect, useCallback } from "react";
import { getStock, type YahooStockResponse } from "../services/stockService";

export function useStock(symbol: string) {
  const [data, setData] = useState<YahooStockResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStock = useCallback(async () => {
    if (!symbol || !symbol.trim()) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getStock(symbol);
      setData(result);
    } catch (err: any) {
      console.error(`useStock error for ${symbol}:`, err);
      setError(err?.message || `Failed to fetch quote for ${symbol}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    void fetchStock();
  }, [fetchStock]);

  return {
    data,
    loading,
    error,
    refresh: fetchStock,
  };
}
