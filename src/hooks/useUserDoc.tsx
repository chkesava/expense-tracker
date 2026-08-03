import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { doc, onSnapshot, type DocumentData } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";
import type { UserRole } from "../types/user";

type UserDocContextType = {
  /** Raw Firestore `users/{realUid}` data, or null if missing / logged out */
  data: DocumentData | null;
  exists: boolean;
  loading: boolean;
  role: UserRole;
  isAdmin: boolean;
};

const UserDocContext = createContext<UserDocContextType | undefined>(undefined);

/**
 * Single shared listener for `users/{uid}`.
 * Theme, settings, and role all read from this instead of opening their own snapshots.
 */
export function UserDocProvider({ children }: { children: ReactNode }) {
  const { realUser, user } = useAuth();
  const [data, setData] = useState<DocumentData | null>(null);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(realUser));

  useEffect(() => {
    if (!realUser) {
      setData(null);
      setExists(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, "users", realUser.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setData(snap.data());
          setExists(true);
        } else {
          setData(null);
          setExists(false);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching user document:", error);
        setData(null);
        setExists(false);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [realUser]);

  // Duress session uses a synthetic uid — never expose admin privileges there
  const isDuress = Boolean(realUser && user && realUser.uid !== user.uid);

  const role: UserRole = useMemo(() => {
    if (isDuress) return "USER";
    return data?.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "USER";
  }, [data?.role, isDuress]);

  const value = useMemo<UserDocContextType>(
    () => ({
      data,
      exists,
      loading,
      role,
      isAdmin: role === "SUPER_ADMIN",
    }),
    [data, exists, loading, role]
  );

  return (
    <UserDocContext.Provider value={value}>{children}</UserDocContext.Provider>
  );
}

export function useUserDoc() {
  const context = useContext(UserDocContext);
  if (context === undefined) {
    throw new Error("useUserDoc must be used within a UserDocProvider");
  }
  return context;
}
