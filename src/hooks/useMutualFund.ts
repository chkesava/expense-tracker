import { useState, useEffect, useCallback } from "react";
import { getMutualFund, type MutualFundQuoteDTO } from "../services/mutualFundService";

export function useMutualFund(schemeCode: string) {
  const [data, setData] = useState<MutualFundQuoteDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFund = useCallback(async () => {
    if (!schemeCode || !schemeCode.trim()) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getMutualFund(schemeCode);
      setData(result);
    } catch (err: unknown) {
      console.error(`useMutualFund error for ${schemeCode}:`, err);
      setError(err instanceof Error ? err.message : `Failed to fetch NAV for scheme ${schemeCode}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [schemeCode]);

  useEffect(() => {
    void fetchFund();
  }, [fetchFund]);

  return {
    data,
    loading,
    error,
    refresh: fetchFund,
  };
}
