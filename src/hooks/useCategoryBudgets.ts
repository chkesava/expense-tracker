import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { db } from "../firebase";
import type { CategoryBudget } from "../types/expense";
import { useAuth } from "./useAuth";

export const useCategoryBudgets = () => {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBudgets([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "categoryBudgets"),
      orderBy("month", "desc"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snap) => {
      setBudgets(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CategoryBudget)));
      setLoading(false);
    });
  }, [user]);

  const addBudget = async (category: string, amount: number, month: string) => {
    if (!user || !category.trim() || !month || amount <= 0) return;

    try {
      await addDoc(collection(db, "users", user.uid, "categoryBudgets"), {
        category: category.trim(),
        amount: Number(amount),
        month,
        createdAt: serverTimestamp(),
      });
      toast.success("Category budget added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add category budget");
    }
  };

  const deleteBudget = async (id: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "categoryBudgets", id));
      toast.success("Category budget deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete category budget");
    }
  };

  return { budgets, loading, addBudget, deleteBudget };
};
