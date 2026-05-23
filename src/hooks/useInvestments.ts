import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { db } from "../firebase";
import type { Investment, InvestmentStatus } from "../types/investment";
import { useAuth } from "./useAuth";
import { isValidDateKey } from "../utils/dates";

export type CreateInvestmentInput = Omit<Investment, "id" | "createdAt">;

export function useInvestments() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setInvestments([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "users", user.uid, "investments"));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Investment));
        list.sort(
          (a, b) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
        setInvestments(list);
        setLoading(false);
      },
      (err) => {
        console.error("useInvestments snapshot error:", err);
        setLoading(false);
      }
    );
  }, [user]);

  const addInvestment = async (data: CreateInvestmentInput): Promise<string | null> => {
    if (!user || !data.name.trim()) return null;
    try {
      const ref = await addDoc(collection(db, "users", user.uid, "investments"), {
        ...stripUndefined(data),
        name: data.name.trim(),
        createdAt: serverTimestamp(),
      });
      toast.success("Investment added");
      return ref.id;
    } catch (err) {
      console.error(err);
      toast.error("Failed to add investment");
      return null;
    }
  };

  const updateInvestment = async (
    id: string,
    patch: Partial<Omit<Investment, "id" | "createdAt">>
  ) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "investments", id), stripUndefined(patch));
      toast.success("Investment updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update investment");
    }
  };

  const setStatus = async (id: string, status: InvestmentStatus, closedDate?: string) => {
    const patch: Partial<Investment> = { status };
    if (status === "closed" || status === "matured") {
      patch.closedDate = closedDate && isValidDateKey(closedDate) ? closedDate : undefined;
    }
    await updateInvestment(id, patch);
  };

  const deleteInvestment = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "investments", id));
      toast.success("Investment removed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove investment");
    }
  };

  return {
    investments,
    loading,
    addInvestment,
    updateInvestment,
    setStatus,
    deleteInvestment,
  };
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}
