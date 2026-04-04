import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { db } from "../firebase";
import type { CategorizationRule } from "../types/expense";
import { useAuth } from "./useAuth";

export const useCategorizationRules = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRules([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "categorizationRules"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snap) => {
      setRules(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CategorizationRule)));
      setLoading(false);
    });
  }, [user]);

  const addRule = async (keyword: string, category: string) => {
    if (!user || !keyword.trim() || !category.trim()) return;

    try {
      await addDoc(collection(db, "users", user.uid, "categorizationRules"), {
        keyword: keyword.trim().toLowerCase(),
        category: category.trim(),
        createdAt: serverTimestamp(),
      });
      toast.success("Auto-category rule added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add rule");
    }
  };

  const deleteRule = async (id: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "categorizationRules", id));
      toast.success("Rule deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete rule");
    }
  };

  return { rules, loading, addRule, deleteRule };
};
