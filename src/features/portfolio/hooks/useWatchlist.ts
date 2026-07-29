import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { db } from "../../../firebase";
import type { WatchlistItem } from "../types";
import { useAuth } from "../../../hooks/useAuth";
import type { WatchlistInput } from "../schemas";

export function useWatchlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "users", user.uid, "watchlist"));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WatchlistItem));
        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.error("useWatchlist error:", err);
        setLoading(false);
      }
    );
  }, [user]);

  const addToWatchlist = async (data: WatchlistInput) => {
    if (!user) return;
    if (items.some((i) => i.yahooSymbol === data.yahooSymbol)) {
      toast.info("Already in watchlist");
      return;
    }
    try {
      await addDoc(collection(db, "users", user.uid, "watchlist"), {
        ...data,
        createdAt: serverTimestamp(),
      });
      toast.success("Added to watchlist");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add to watchlist");
    }
  };

  const removeFromWatchlist = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "watchlist", id));
      toast.success("Removed from watchlist");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove from watchlist");
    }
  };

  return { items, loading, addToWatchlist, removeFromWatchlist };
}
