import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { db } from "../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

type Settings = {
  lockPastMonths: boolean;
  compactListMode: boolean;
  defaultCategory: string;
  defaultView: "add" | "expenses" | "analytics" | "dashboard";
  exportYear: number;
  monthlyBudget: number;
  timezone: string;
};

const DEFAULTS: Settings = {
  lockPastMonths: true,
  compactListMode: false,
  defaultCategory: "Food",
  defaultView: "dashboard",
  exportYear: new Date().getFullYear(),
  monthlyBudget: 0,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export default function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  // Load settings from Firestore
  useEffect(() => {
    if (!user) {
      setSettings(DEFAULTS);
      setLoading(false);
      return;
    }

    const ref = doc(db, "users", user.uid, "settings", "preferences");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setSettings({ ...DEFAULTS, ...snap.data() } as Settings);
      } else {
        // Init defaults if not exists
        setDoc(ref, DEFAULTS).catch(console.error);
        setSettings(DEFAULTS);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Helper to update specific fields
  const updateSettings = async (updates: Partial<Settings>) => {
    if (!user) return;

    // Optimistic update
    setSettings((prev) => ({ ...prev, ...updates }));

    try {
      const ref = doc(db, "users", user.uid, "settings", "preferences");
      await setDoc(ref, updates, { merge: true });
    } catch (err) {
      console.error("Failed to save settings", err);
      // Revert optimization on error? ideally yes, but keeping simple for now
    }
  };

  const setLockPastMonths = (val: boolean) => updateSettings({ lockPastMonths: val });
  const setCompactListMode = (val: boolean) => updateSettings({ compactListMode: val });
  const setDefaultCategory = (val: string) => updateSettings({ defaultCategory: val });
  const setDefaultView = (val: Settings["defaultView"]) => updateSettings({ defaultView: val });
  const setExportYear = (val: number) => updateSettings({ exportYear: val });
  const setMonthlyBudget = (val: number) => updateSettings({ monthlyBudget: val });
  const setTimezone = (val: string) => updateSettings({ timezone: val });

  return {
    settings,
    loading,
    setLockPastMonths,
    setCompactListMode,
    setDefaultCategory,
    setDefaultView,
    setExportYear,
    setMonthlyBudget,
    setTimezone,
  };
}
