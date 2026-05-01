import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { useEffect, useState } from "react";
import type { Income } from "../types/expense";
import { useAuth } from "./useAuth";

export const useIncomes = () => {
  const { user } = useAuth();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIncomes([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "incomes"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, snap => {
      setIncomes(
        snap.docs.map(d => ({ id: d.id, ...d.data() } as Income))
      );
      setLoading(false);
    }, (error) => {
      console.error("Error fetching incomes:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { incomes, loading };
};
