import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
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
  dashboardWidgets: {
    subscriptions: boolean;
    focus: boolean;
    gamification: boolean;
    topCategories: boolean;
  };
};

const DEFAULTS: Settings = {
  lockPastMonths: true,
  compactListMode: false,
  defaultCategory: "Food",
  defaultView: "dashboard",
  exportYear: new Date().getFullYear(),
  monthlyBudget: 0,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dashboardWidgets: {
    subscriptions: true,
    focus: true,
    gamification: true,
    topCategories: true,
  },
};

type SettingsContextType = {
  settings: Settings;
  loading: boolean;
  setLockPastMonths: (val: boolean) => void;
  setCompactListMode: (val: boolean) => void;
  setDefaultCategory: (val: string) => void;
  setDefaultView: (val: Settings["defaultView"]) => void;
  setExportYear: (val: number) => void;
  setMonthlyBudget: (val: number) => void;
  setTimezone: (val: string) => void;
  toggleDashboardWidget: (key: keyof Settings["dashboardWidgets"]) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
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

    // Changed path to root user document: users/{uid}
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        // Merge defaults with existing data to ensure new fields are handled
        const data = snap.data();
        setSettings({
          ...DEFAULTS,
          ...data,
          dashboardWidgets: {
            ...DEFAULTS.dashboardWidgets,
            ...(data.dashboardWidgets || {}),
          },
        } as Settings);
      } else {
        // Init defaults if document doesn't exist
        setDoc(ref, DEFAULTS, { merge: true }).catch(console.error);
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
      const ref = doc(db, "users", user.uid);
      await setDoc(ref, updates, { merge: true });
    } catch (err) {
      console.error("Failed to save settings", err);
    }
  };

  const setLockPastMonths = (val: boolean) => updateSettings({ lockPastMonths: val });
  const setCompactListMode = (val: boolean) => updateSettings({ compactListMode: val });
  const setDefaultCategory = (val: string) => updateSettings({ defaultCategory: val });
  const setDefaultView = (val: Settings["defaultView"]) => updateSettings({ defaultView: val });
  const setExportYear = (val: number) => updateSettings({ exportYear: val });
  const setMonthlyBudget = (val: number) => updateSettings({ monthlyBudget: val });
  const setTimezone = (val: string) => updateSettings({ timezone: val });

  const toggleDashboardWidget = (key: keyof Settings["dashboardWidgets"]) => {
    const newWidgets = { ...settings.dashboardWidgets, [key]: !settings.dashboardWidgets[key] };
    updateSettings({ dashboardWidgets: newWidgets });
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        setLockPastMonths,
        setCompactListMode,
        setDefaultCategory,
        setDefaultView,
        setExportYear,
        setMonthlyBudget,
        setTimezone,
        toggleDashboardWidget,
      }}
    >
      {!loading && children}
    </SettingsContext.Provider>
  );
}

export default function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
