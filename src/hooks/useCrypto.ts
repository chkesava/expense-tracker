import { useState, useEffect, useCallback } from "react";
import { getCrypto, getCryptoQuotes, type CryptoQuoteDTO } from "../services/cryptoService";

export function useCrypto(coinId: string) {
  const [data, setData] = useState<CryptoQuoteDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoin = useCallback(async () => {
    if (!coinId || !coinId.trim()) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getCrypto(coinId);
      setData(result);
    } catch (err: unknown) {
      console.error(`useCrypto error for ${coinId}:`, err);
      setError(err instanceof Error ? err.message : `Failed to fetch price for ${coinId}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [coinId]);

  useEffect(() => {
    void fetchCoin();
  }, [fetchCoin]);

  return {
    data,
    loading,
    error,
    refresh: fetchCoin,
  };
}

export function useCryptoBatch(coinIds: string[]) {
  const stableKey = [...new Set(coinIds.map((id) => id.trim().toLowerCase()).filter(Boolean))]
    .sort()
    .join(",");

  const [data, setData] = useState<CryptoQuoteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatch = useCallback(async () => {
    if (!stableKey) {
      setLoading(false);
      setData([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getCryptoQuotes(stableKey.split(","));
      setData(result);
    } catch (err: unknown) {
      console.error("useCryptoBatch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch crypto prices");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [stableKey]);

  useEffect(() => {
    void fetchBatch();
  }, [fetchBatch]);

  return {
    data,
    loading,
    error,
    refresh: fetchBatch,
  };
}
