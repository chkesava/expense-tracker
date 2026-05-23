import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { db } from "../firebase";
import type { AccountEntry } from "../types/expense";
import { useAuth } from "./useAuth";
import { isValidDateKey } from "../utils/dates";

export function useAccountEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AccountEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "users", user.uid, "accountEntries"));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AccountEntry));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEntries(list);
        setLoading(false);
      },
      (err) => {
        console.error("useAccountEntries snapshot error:", err);
        setLoading(false);
      }
    );
  }, [user]);

  const addEntry = async (
    accountId: string,
    amount: number,
    direction: "credit" | "debit",
    date: string,
    note?: string
  ): Promise<boolean> => {
    if (!user || !accountId || amount <= 0 || !date) {
      toast.error("Enter a valid amount and date");
      return false;
    }
    if (!isValidDateKey(date)) {
      toast.error("Invalid entry date");
      return false;
    }
    try {
      await addDoc(collection(db, "users", user.uid, "accountEntries"), {
        accountId,
        amount,
        direction,
        date,
        note: note?.trim() || "",
        createdAt: serverTimestamp(),
      });
      toast.success(direction === "credit" ? "Funds added to account" : "Debit recorded in account");
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Failed to save account entry");
      return false;
    }
  };

  const deleteEntry = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "accountEntries", id));
      toast.success("Account entry removed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove account entry");
    }
  };

  return { entries, loading, addEntry, deleteEntry };
}
