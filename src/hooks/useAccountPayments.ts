import {
  collection,
  onSnapshot,
  query,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useEffect, useState } from "react";
import type { AccountPayment } from "../types/expense";
import { useAuth } from "./useAuth";
import { toast } from "react-toastify";
import { isValidDateKey } from "../utils/dates";

export function useAccountPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<AccountPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPayments([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "users", user.uid, "accountPayments"));

    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AccountPayment));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPayments(list);
        setLoading(false);
      },
      (err) => {
        console.error("useAccountPayments snapshot error:", err);
        setLoading(false);
      }
    );
  }, [user]);

  const addPayment = async (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date: string,
    note?: string,
    opts?: { appliedCycleStart?: string; appliedCycleEnd?: string }
  ) => {
    if (!user || !fromAccountId || !toAccountId || amount <= 0) return;
    if (fromAccountId === toAccountId) {
      toast.error("Source and destination accounts must differ");
      return;
    }
    if (!isValidDateKey(date)) {
      toast.error("Invalid payment date");
      return;
    }
    try {
      await addDoc(collection(db, "users", user.uid, "accountPayments"), {
        fromAccountId,
        toAccountId,
        amount,
        date,
        note: note?.trim() || "",
        sourceType: "account",
        ...(opts?.appliedCycleStart
          ? { appliedCycleStart: opts.appliedCycleStart }
          : {}),
        ...(opts?.appliedCycleEnd ? { appliedCycleEnd: opts.appliedCycleEnd } : {}),
        createdAt: serverTimestamp(),
      });
      toast.success("Bill payment recorded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to record payment");
    }
  };

  const addExternalPayment = async (
    toAccountId: string,
    amount: number,
    date: string,
    note?: string,
    opts?: { appliedCycleStart?: string; appliedCycleEnd?: string }
  ) => {
    if (!user || !toAccountId || amount <= 0) return;
    if (!isValidDateKey(date)) {
      toast.error("Invalid payment date");
      return;
    }
    try {
      await addDoc(collection(db, "users", user.uid, "accountPayments"), {
        fromAccountId: "external",
        toAccountId,
        amount,
        date,
        note: note?.trim() || "",
        sourceType: "external",
        ...(opts?.appliedCycleStart
          ? { appliedCycleStart: opts.appliedCycleStart }
          : {}),
        ...(opts?.appliedCycleEnd ? { appliedCycleEnd: opts.appliedCycleEnd } : {}),
        createdAt: serverTimestamp(),
      });
      toast.success("Marked as already paid");
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark as paid");
    }
  };

  const deletePayment = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "accountPayments", id));
      toast.success("Payment removed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove payment");
    }
  };

  return { payments, loading, addPayment, addExternalPayment, deletePayment };
}
