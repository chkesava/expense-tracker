import { useEffect, useMemo, useState } from "react";
import { collection, documentId, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { UserProfile } from "./useUsers";

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function useUserProfilesByIds(memberIds: string[]) {
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(false);

  const stableIds = useMemo(() => Array.from(new Set(memberIds)).filter(Boolean).sort(), [memberIds]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (stableIds.length === 0) {
        setProfiles({});
        return;
      }
      setLoading(true);
      try {
        const usersRef = collection(db, "users");
        const next: Record<string, UserProfile> = {};

        for (const ids of chunk(stableIds, 10)) {
          const q = query(usersRef, where(documentId(), "in", ids));
          const snap = await getDocs(q);
          snap.forEach((d) => {
            const data = d.data() as {
              displayName?: string;
              email?: string;
              photoURL?: string;
              username?: string;
              upiId?: string;
            };
            next[d.id] = {
              uid: d.id,
              displayName: data.displayName || "Anonymous",
              email: data.email || "",
              photoURL: data.photoURL,
              username: data.username,
              upiId: data.upiId,
            };
          });
        }

        if (!cancelled) setProfiles(next);
      } catch (error) {
        console.error("Failed fetching user profiles:", error);
        if (!cancelled) setProfiles({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [stableIds]);

  return { profiles, loading };
}
