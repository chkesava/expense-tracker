import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./useAuth";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useUserDoc } from "./useUserDoc";

type Settings = {
  lockPastMonths: boolean;
  compactListMode: boolean;
  defaultCategory: string;
  defaultView: "add" | "expenses" | "analytics" | "dashboard";
  exportYear: number;
  monthlyBudget: number;
  timezone: string;
  upiId: string;
  dashboardWidgets: {
    subscriptions: boolean;
    focus: boolean;
    gamification: boolean;
    topCategories: boolean;
  };
  enableInvestments: boolean;
  dashboardOrder: string[];
  navigationStyle: "bottom" | "dock";
  ghostMode: boolean;
  privacyPin: string;
  fakePin: string;
  lockOnInactivity: boolean;
  inactivityTimeout: number; // in seconds
  lockOnAppSwitch: boolean;
};

export const DEFAULTS: Settings = {
  lockPastMonths: true,
  compactListMode: false,
  defaultCategory: "Food & Dining",
  defaultView: "dashboard",
  exportYear: new Date().getFullYear(),
  monthlyBudget: 0,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  upiId: "",
  dashboardWidgets: {
    subscriptions: true,
    focus: true,
    gamification: true,
    topCategories: true,
  },
  enableInvestments: true,
  dashboardOrder: ["focus", "gamification", "subscriptions", "topCategories", "overview", "investments", "quickAdd", "insight", "budgetAlerts", "financialGoals", "recentActivity"],
  navigationStyle: "bottom",
  ghostMode: false,
  privacyPin: "",
  fakePin: "",
  lockOnInactivity: true,
  inactivityTimeout: 60,
  lockOnAppSwitch: true,
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
  setUpiId: (val: string) => void;
  toggleDashboardWidget: (key: keyof Settings["dashboardWidgets"]) => void;
  setDashboardOrder: (order: string[]) => void;
  setNavigationStyle: (val: Settings["navigationStyle"]) => void;
  setGhostMode: (val: boolean) => void;
  setPrivacyPin: (val: string) => void;
  setFakePin: (val: string) => void;
  setLockOnInactivity: (val: boolean) => void;
  setInactivityTimeout: (val: number) => void;
  setLockOnAppSwitch: (val: boolean) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

function mergeSettingsFromDoc(data: Record<string, unknown> | null): Settings {
  if (!data) return DEFAULTS;
  return {
    ...DEFAULTS,
    ...data,
    dashboardWidgets: {
      ...DEFAULTS.dashboardWidgets,
      ...((data.dashboardWidgets as Settings["dashboardWidgets"]) || {}),
    },
    dashboardOrder: (data.dashboardOrder as string[]) || DEFAULTS.dashboardOrder,
    ghostMode: (data.ghostMode as boolean | undefined) ?? DEFAULTS.ghostMode,
  } as Settings;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { realUser } = useAuth();
  const { data, exists, loading: userDocLoading } = useUserDoc();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [seedAttempted, setSeedAttempted] = useState(false);

  // Derive settings from the shared user doc (no extra onSnapshot)
  useEffect(() => {
    if (!realUser) {
      setSettings(DEFAULTS);
      setSeedAttempted(false);
      return;
    }
    if (userDocLoading) return;

    if (exists && data) {
      setSettings(mergeSettingsFromDoc(data as Record<string, unknown>));
      setSeedAttempted(false);
    } else if (!exists && !seedAttempted) {
      setSeedAttempted(true);
      setDoc(doc(db, "users", realUser.uid), DEFAULTS, { merge: true }).catch(console.error);
      setSettings(DEFAULTS);
    }
  }, [realUser, data, exists, userDocLoading, seedAttempted]);

  useEffect(() => {
    if (settings.ghostMode) {
      document.body.classList.add("ghost-mode");
    } else {
      document.body.classList.remove("ghost-mode");
    }
  }, [settings.ghostMode]);

  const loading = Boolean(realUser) && userDocLoading;

  const updateSettings = async (updates: Partial<Settings>) => {
    if (!realUser) return;
    setSettings((prev) => ({ ...prev, ...updates }));
    try {
      const ref = doc(db, "users", realUser.uid);
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
  const setUpiId = (val: string) => updateSettings({ upiId: val });

  const toggleDashboardWidget = (key: keyof Settings["dashboardWidgets"]) => {
    const newWidgets = { ...settings.dashboardWidgets, [key]: !settings.dashboardWidgets[key] };
    updateSettings({ dashboardWidgets: newWidgets });
  };

  const setDashboardOrder = (order: string[]) => updateSettings({ dashboardOrder: order });
  const setNavigationStyle = (val: Settings["navigationStyle"]) => updateSettings({ navigationStyle: val });
  const setGhostMode = (val: boolean) => updateSettings({ ghostMode: val });
  const setPrivacyPin = (val: string) => updateSettings({ privacyPin: val });
  const setFakePin = (val: string) => updateSettings({ fakePin: val });
  const setLockOnInactivity = (val: boolean) => updateSettings({ lockOnInactivity: val });
  const setInactivityTimeout = (val: number) => updateSettings({ inactivityTimeout: val });
  const setLockOnAppSwitch = (val: boolean) => updateSettings({ lockOnAppSwitch: val });

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
        setUpiId,
        toggleDashboardWidget,
        setDashboardOrder,
        setNavigationStyle,
        setGhostMode,
        setPrivacyPin,
        setFakePin,
        setLockOnInactivity,
        setInactivityTimeout,
        setLockOnAppSwitch,
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
