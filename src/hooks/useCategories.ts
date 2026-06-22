import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query } from "firebase/firestore";
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
      collection(db, "users", user.uid, "categories")
    );

    return onSnapshot(q, (snap) => {
      setCategories(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category))
      );
      setLoading(false);
    }, (err) => {
      console.error("useCategories snapshot error:", err);
      setLoading(false);
    });
  }, [user]);

  const addCategory = async (name: string) => {
    if (!user || !name.trim()) return;
    try {
      await addDoc(collection(db, "users", user.uid, "categories"), {
        name: name.trim(),
        isArchived: false,
        createdAt: serverTimestamp(),
      });
      toast.success("Category added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add category");
    }
  };

  const updateCategory = async (id: string, newName: string) => {
    if (!user || !newName.trim()) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "categories", id), {
        name: newName.trim(),
      });
      toast.success("Category updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update category");
    }
  };

  const archiveCategory = async (id: string, isArchived = true) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "categories", id), {
        isArchived,
      });
      toast.success(isArchived ? "Category archived" : "Category restored");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update category status");
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

  return { categories, loading, addCategory, updateCategory, archiveCategory, deleteCategory };
};
