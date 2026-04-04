import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { db } from "../firebase";
import type { FinancialGoal } from "../types/expense";
import { useAuth } from "./useAuth";

export const useFinancialGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setGoals([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "financialGoals"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snap) => {
      setGoals(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialGoal)));
      setLoading(false);
    });
  }, [user]);

  const addGoal = async (name: string, targetAmount: number, currentAmount: number, deadline?: string) => {
    if (!user || !name.trim() || targetAmount <= 0) return;

    try {
      await addDoc(collection(db, "users", user.uid, "financialGoals"), {
        name: name.trim(),
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount) || 0,
        deadline: deadline || "",
        createdAt: serverTimestamp(),
      });
      toast.success("Goal added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add goal");
    }
  };

  const updateGoalProgress = async (id: string, currentAmount: number) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid, "financialGoals", id), {
        currentAmount: Number(currentAmount) || 0,
      });
      toast.success("Goal progress updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update goal");
    }
  };

  const deleteGoal = async (id: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "financialGoals", id));
      toast.success("Goal deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete goal");
    }
  };

  return { goals, loading, addGoal, updateGoalProgress, deleteGoal };
};
