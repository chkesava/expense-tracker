import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "../../../lib/toast";
import { db } from "../../../firebase";
import { useAuth } from "../../../hooks/useAuth";
import type { PortfolioOrder } from "../types";

export function usePortfolioOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PortfolioOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "portfolioOrders"),
      orderBy("createdAt", "desc")
    );

    const safetyTimer = setTimeout(() => setLoading(false), 8_000);

    const unsub = onSnapshot(
      q,
      (snap) => {
        clearTimeout(safetyTimer);
        const data = snap.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as PortfolioOrder)
        );
        setOrders(data);
        setLoading(false);
      },
      (err) => {
        clearTimeout(safetyTimer);
        console.error("usePortfolioOrders error:", err);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      unsub();
    };
  }, [user]);

  const addOrder = async (order: Omit<PortfolioOrder, "id" | "createdAt">) => {
    if (!user) return false;
    try {
      const ref = doc(collection(db, "users", user.uid, "portfolioOrders"));
      await setDoc(ref, {
        ...order,
        createdAt: serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.error("Failed to add order", err);
      toast.error("Failed to add order");
      return false;
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!user) return false;
    try {
      const ref = doc(db, "users", user.uid, "portfolioOrders", orderId);
      await updateDoc(ref, {
        status: "cancelled",
        updatedAt: serverTimestamp(),
      });
      toast.success("Order cancelled");
      return true;
    } catch (err) {
      console.error("Failed to cancel order", err);
      toast.error("Failed to cancel order");
      return false;
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!user) return false;
    try {
      await deleteDoc(doc(db, "users", user.uid, "portfolioOrders", orderId));
      return true;
    } catch (err) {
      console.error("Failed to delete order", err);
      return false;
    }
  };

  return {
    orders,
    loading,
    addOrder,
    cancelOrder,
    deleteOrder,
  };
}
