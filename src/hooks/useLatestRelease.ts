import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { LATEST_RELEASE_DOC, parseRelease, type AppRelease } from "../utils/appRelease";

export function useLatestRelease() {
  const [release, setRelease] = useState<AppRelease | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, LATEST_RELEASE_DOC[0], LATEST_RELEASE_DOC[1]),
      (snap) => {
        setRelease(snap.exists() ? parseRelease(snap.data() as Record<string, unknown>) : null);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching latest Android release:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { release, loading };
}
