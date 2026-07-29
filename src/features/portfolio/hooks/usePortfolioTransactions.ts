import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { db } from "../../../firebase";
import type { OrderStatus, PortfolioTransaction, TransactionType } from "../types";
import { useAuth } from "../../../hooks/useAuth";

export type CreateTransactionInput = Omit<PortfolioTransaction, "id" | "createdAt">;

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}

export function usePortfolioTransactions(holdingId?: string) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const base = collection(db, "users", user.uid, "portfolioTransactions");
    const q = holdingId
      ? query(base, where("holdingId", "==", holdingId))
      : query(base);

    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as PortfolioTransaction)
        );
        list.sort((a, b) => b.date.localeCompare(a.date));
        setTransactions(list);
        setLoading(false);
      },
      (err) => {
        console.error("usePortfolioTransactions error:", err);
        setLoading(false);
      }
    );
  }, [user, holdingId]);

  const addTransaction = async (
    data: CreateTransactionInput
  ): Promise<string | null> => {
    if (!user) return null;
    try {
      const ref = await addDoc(
        collection(db, "users", user.uid, "portfolioTransactions"),
        {
          ...stripUndefined(data),
          createdAt: serverTimestamp(),
        }
      );
      return ref.id;
    } catch (err) {
      console.error(err);
      toast.error("Failed to record transaction");
      return null;
    }
  };

  const updateOrderStatus = async (id: string, orderStatus: OrderStatus) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "portfolioTransactions", id), {
        orderStatus,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update order");
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "portfolioTransactions", id));
      toast.success("Transaction removed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove transaction");
    }
  };

  const getByHolding = (id: string) =>
    transactions.filter((t) => t.holdingId === id);

  const getByType = (type: TransactionType) =>
    transactions.filter((t) => t.type === type);

  return {
    transactions,
    loading,
    addTransaction,
    updateOrderStatus,
    deleteTransaction,
    getByHolding,
    getByType,
  };
}
