import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { db } from "../../../firebase";
import type { PortfolioSnapshot } from "../types";
import { useAuth } from "../../../hooks/useAuth";
import { toLocalDateKey } from "../../../utils/dates";

export function usePortfolioSnapshots() {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSnapshots([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "users", user.uid, "portfolioSnapshots"));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as PortfolioSnapshot)
        );
        list.sort((a, b) => a.date.localeCompare(b.date));
        setSnapshots(list);
        setLoading(false);
      },
      (err) => {
        console.error("usePortfolioSnapshots error:", err);
        setLoading(false);
      }
    );
  }, [user]);

  const saveDailySnapshot = useCallback(
    async (data: Omit<PortfolioSnapshot, "id" | "createdAt">) => {
      if (!user) return;
      const today = toLocalDateKey(new Date());
      const ref = doc(db, "users", user.uid, "portfolioSnapshots", today);
      const existing = await getDoc(ref);
      if (existing.exists()) return;

      await setDoc(ref, {
        ...data,
        date: today,
        createdAt: serverTimestamp(),
      });
    },
    [user]
  );

  return { snapshots, loading, saveDailySnapshot };
}
