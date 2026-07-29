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
import { db } from "../../../firebase";
import type { PriceAlert } from "../types";
import { useAuth } from "../../../hooks/useAuth";
import type { AlertInput } from "../schemas";

export function useAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "users", user.uid, "alerts"));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PriceAlert));
        setAlerts(list);
        setLoading(false);
      },
      (err) => {
        console.error("useAlerts error:", err);
        setLoading(false);
      }
    );
  }, [user]);

  const addAlert = async (data: AlertInput) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "users", user.uid, "alerts"), {
        ...data,
        isActive: true,
        createdAt: serverTimestamp(),
      });
      toast.success("Alert created");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create alert");
    }
  };

  const toggleAlert = async (id: string, isActive: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "alerts", id), { isActive });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update alert");
    }
  };

  const deleteAlert = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "alerts", id));
      toast.success("Alert removed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove alert");
    }
  };

  return { alerts, loading, addAlert, toggleAlert, deleteAlert };
}
