import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { db } from "../../../firebase";
import { useAuth } from "../../../hooks/useAuth";
import { fetchQuotes } from "../../portfolio/services/marketDataService";
import {
  positionMetrics,
  summarizeSipPlans,
  bestAndWorst,
  allocationByAssetType,
  allocationBySymbol,
} from "../services/sipCalculations";
import type { SipPlan, VirtualPosition, VirtualPositionWithMetrics } from "../types";

export function useVirtualPortfolio(plans: SipPlan[] = []) {
  const { user } = useAuth();
  const [positions, setPositions] = useState<VirtualPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPositions([]);
      setLoading(false);
      return;
    }
    const unsub: Unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "virtualPortfolio"),
      (snap) => {
        setPositions(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<VirtualPosition, "id">),
          }))
        );
        setLoading(false);
      },
      (err) => {
        console.error("virtualPortfolio snapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const quoteKeys = useMemo(
    () => positions.map((p) => p.quoteKey).filter(Boolean),
    [positions]
  );

  const { data: quotesMap, isLoading: quotesLoading } = useQuery({
    queryKey: ["sip-virtual-quotes", quoteKeys.slice().sort().join(",")],
    queryFn: async () => {
      try {
        return await fetchQuotes(quoteKeys);
      } catch {
        return new Map();
      }
    },
    enabled: quoteKeys.length > 0,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });

  const enriched: VirtualPositionWithMetrics[] = useMemo(() => {
    return positions.map((p) => {
      const quote = quotesMap?.get(p.quoteKey);
      return positionMetrics(p, quote?.currentPrice);
    });
  }, [positions, quotesMap]);

  const summary = useMemo(
    () => summarizeSipPlans(plans, enriched),
    [plans, enriched]
  );

  const { best, worst } = useMemo(() => bestAndWorst(enriched), [enriched]);
  const typeAllocation = useMemo(() => allocationByAssetType(enriched), [enriched]);
  const symbolAllocation = useMemo(() => allocationBySymbol(enriched), [enriched]);

  return {
    positions: enriched,
    loading: loading || quotesLoading,
    summary,
    best,
    worst,
    typeAllocation,
    symbolAllocation,
  };
}
