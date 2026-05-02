import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "../firebase";
import { useAuth } from "./useAuth";
import type { VaultExpense } from "../types/vaultExpense";

export function useVaultExpenses(vaultId?: string) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<VaultExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const expensesRef = useMemo(() => {
    if (!vaultId) return null;
    return collection(db, "vaults", vaultId, "expenses");
  }, [vaultId]);

  useEffect(() => {
    if (!user || !expensesRef) {
      const id = requestAnimationFrame(() => {
        setExpenses([]);
        setLoading(false);
      });
      return () => cancelAnimationFrame(id);
    }

    const q = query(expensesRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as VaultExpense)));
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching vault expenses:", error);
        toast.error("Failed to load vault expenses");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, expensesRef]);

  const addVaultExpense = useCallback(
    async (payload: Omit<VaultExpense, "id" | "createdAt" | "createdBy">) => {
      if (!user) return;
      if (!vaultId) return;
      try {
        await addDoc(collection(db, "vaults", vaultId, "expenses"), {
          ...payload,
          vaultId,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
        toast.success("Added to vault");
      } catch (error) {
        console.error("Error adding vault expense:", error);
        toast.error("Failed to add expense");
      }
    },
    [user, vaultId]
  );

  const deleteVaultExpense = useCallback(
    async (expenseId: string) => {
      if (!vaultId) return;
      try {
        await deleteDoc(doc(db, "vaults", vaultId, "expenses", expenseId));
        toast.success("Expense removed");
      } catch (error) {
        console.error("Error deleting vault expense:", error);
        toast.error("Failed to delete expense");
      }
    },
    [vaultId]
  );

  return { expenses, loading, addVaultExpense, deleteVaultExpense };
}
