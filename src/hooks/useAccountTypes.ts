import { collection, onSnapshot, orderBy, query, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useEffect, useState } from "react";
import type { AccountType } from "../types/expense";
import { useAuth } from "./useAuth";
import { toast } from "react-toastify";

export const useAccountTypes = () => {
  const { user } = useAuth();
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAccountTypes([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "accountTypes"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snap) => {
      setAccountTypes(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as AccountType))
      );
      setLoading(false);
    });
  }, [user]);

  const addAccountType = async (name: string) => {
    if (!user || !name.trim()) return;
    try {
      await addDoc(collection(db, "users", user.uid, "accountTypes"), {
        name: name.trim(),
        createdAt: serverTimestamp(),
      });
      toast.success("Account type added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add account type");
    }
  };

  const deleteAccountType = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "accountTypes", id));
      toast.success("Account type deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete account type");
    }
  };

  return { accountTypes, loading, addAccountType, deleteAccountType };
};
