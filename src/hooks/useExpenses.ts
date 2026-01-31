import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { useEffect, useState } from "react";
import type { Expense } from "../types/expense";
import { useAuth } from "./useAuth";

export const useExpenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "expenses"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, snap => {
      setExpenses(
        snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense))
      );
    });
  }, [user]);

  return expenses;
};
