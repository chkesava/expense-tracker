import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { useEffect, useState } from "react";
import type { Expense } from "../types/expense";
import { useAuth } from "./useAuth";

export const useExpenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "expenses"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, snap => {
      setExpenses(
        snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense))
      );
      setLoading(false);
    }, (error) => {
      console.error("Error fetching expenses:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { expenses, loading };
};
