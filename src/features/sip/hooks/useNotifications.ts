import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../hooks/useAuth";
import type { AppNotification } from "../types";

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub: Unsubscribe = onSnapshot(
      q,
      (snap) => {
        setNotifications(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<AppNotification, "id">),
          }))
        );
        setLoading(false);
      },
      (err) => {
        console.error("notifications snapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markRead = useCallback(
    async (id: string) => {
      if (!user) return;
      await updateDoc(doc(db, "users", user.uid, "notifications", id), { read: true });
    },
    [user]
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(
      unread.map((n) =>
        updateDoc(doc(db, "users", user.uid, "notifications", n.id), { read: true })
      )
    );
  }, [user, notifications]);

  return { notifications, loading, unreadCount, markRead, markAllRead };
}
