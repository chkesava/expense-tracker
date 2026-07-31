import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../hooks/useAuth";
import type { SipTransaction } from "../types";

export function useSipTransactions(sipId?: string | null) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<SipTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const base = collection(db, "users", user.uid, "sipTransactions");
    const q = sipId
      ? query(base, where("sipId", "==", sipId), orderBy("date", "desc"))
      : query(base, orderBy("date", "desc"));

    const unsub: Unsubscribe = onSnapshot(
      q,
      (snap) => {
        setTransactions(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<SipTransaction, "id">),
          }))
        );
        setLoading(false);
      },
      (err) => {
        console.error("sipTransactions snapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, sipId]);

  const executed = useMemo(
    () => transactions.filter((t) => t.status === "executed"),
    [transactions]
  );

  return { transactions, executed, loading };
}
