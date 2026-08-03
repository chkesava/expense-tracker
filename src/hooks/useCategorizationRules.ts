import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "../lib/toast";
import { db } from "../firebase";
import type { CategorizationRule } from "../types/expense";
import { useAuth } from "./useAuth";

export const useCategorizationRules = (options?: { enabled?: boolean }) => {
  const enabled = options?.enabled !== false;
  const { user } = useAuth();
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !enabled) {
      setRules([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "users", user.uid, "categorizationRules"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snap) => {
      setRules(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CategorizationRule)));
      setLoading(false);
    }, (err) => {
      console.error("useCategorizationRules snapshot error:", err);
      setLoading(false);
    });
  }, [user, enabled]);

  const addRule = async (keyword: string, category: string, subcategory?: string) => {
    if (!user || !keyword.trim() || !category.trim()) return;

    try {
      await addDoc(collection(db, "users", user.uid, "categorizationRules"), {
        keyword: keyword.trim().toLowerCase(),
        category: category.trim(),
        ...(subcategory?.trim() ? { subcategory: subcategory.trim() } : {}),
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
