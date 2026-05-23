import {
  collection,
  onSnapshot,
  query,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useEffect, useState } from "react";
import type { Account } from "../types/expense";
import { useAuth } from "./useAuth";
import { toast } from "react-toastify";

export const useAccounts = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "accounts")
    );

    return onSnapshot(q, (snap) => {
      setAccounts(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Account))
      );
      setLoading(false);
    }, (err) => {
      console.error("useAccounts snapshot error:", err);
      setLoading(false);
    });
  }, [user]);

  const addAccount = async (
    name: string,
    typeId: string,
    extras?: Partial<Omit<Account, "id" | "name" | "typeId" | "createdAt">>
  ) => {
    if (!user || !name.trim() || !typeId) return;
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        typeId,
        createdAt: serverTimestamp(),
      };
      if (extras?.billGenerationDay != null) payload.billGenerationDay = extras.billGenerationDay;
      if (extras?.creditLimit != null) payload.creditLimit = extras.creditLimit;
      if (extras?.openingBalance != null) payload.openingBalance = extras.openingBalance;
      if (extras?.balanceInitialized != null) payload.balanceInitialized = extras.balanceInitialized;
      if (extras?.balanceAsOfDate != null) payload.balanceAsOfDate = extras.balanceAsOfDate;
      await addDoc(collection(db, "users", user.uid, "accounts"), payload);
      toast.success("Account added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add account");
    }
  };

  const deleteAccount = async (id: string) => {
    if (!user) return;
    try {
      const base = ["users", user.uid] as const;
      const [
        linkedExpensesSnap,
        linkedIncomesSnap,
        linkedEntriesSnap,
        linkedPaymentsFromSnap,
        linkedPaymentsToSnap,
      ] = await Promise.all([
        getDocs(query(collection(db, ...base, "expenses"), where("accountId", "==", id))),
        getDocs(query(collection(db, ...base, "incomes"), where("accountId", "==", id))),
        getDocs(query(collection(db, ...base, "accountEntries"), where("accountId", "==", id))),
        getDocs(query(collection(db, ...base, "accountPayments"), where("fromAccountId", "==", id))),
        getDocs(query(collection(db, ...base, "accountPayments"), where("toAccountId", "==", id))),
      ]);

      const linkedCount =
        linkedExpensesSnap.size +
        linkedIncomesSnap.size +
        linkedEntriesSnap.size +
        linkedPaymentsFromSnap.size +
        linkedPaymentsToSnap.size;

      if (linkedCount > 0) {
        toast.error(
          `Cannot delete account. ${linkedCount} linked records exist. Move/unlink transactions first.`
        );
        return;
      }

      await deleteDoc(doc(db, "users", user.uid, "accounts", id));
      toast.success("Account deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete account");
    }
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    if (!user) return;
    try {
      const { id: _, createdAt, ...validUpdates } = updates as any;
      const { updateDoc } = await import("firebase/firestore");
      await updateDoc(doc(db, "users", user.uid, "accounts", id), validUpdates);
      toast.success("Account updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update account");
    }
  };

  return { accounts, loading, addAccount, updateAccount, deleteAccount };
};
