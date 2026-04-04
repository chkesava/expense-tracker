import { collection, onSnapshot, orderBy, query, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
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

  const addAccount = async (name: string, typeId: string) => {
    if (!user || !name.trim() || !typeId) return;
    try {
      await addDoc(collection(db, "users", user.uid, "accounts"), {
        name: name.trim(),
        typeId,
        createdAt: serverTimestamp(),
      });
      toast.success("Account added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add account");
    }
  };

  const deleteAccount = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "accounts", id));
      toast.success("Account deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete account");
    }
  };

  return { accounts, loading, addAccount, deleteAccount };
};
