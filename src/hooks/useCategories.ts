import { collection, onSnapshot, orderBy, query, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useEffect, useState } from "react";
import type { Category } from "../types/expense";
import { useAuth } from "./useAuth";
import { toast } from "react-toastify";

export const useCategories = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCategories([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "categories"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snap) => {
      setCategories(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category))
      );
      setLoading(false);
    });
  }, [user]);

  const addCategory = async (name: string) => {
    if (!user || !name.trim()) return;
    try {
      await addDoc(collection(db, "users", user.uid, "categories"), {
        name: name.trim(),
        createdAt: serverTimestamp(),
      });
      toast.success("Category added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add category");
    }
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "categories", id));
      toast.success("Category deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete category");
    }
  };

  return { categories, loading, addCategory, deleteCategory };
};
