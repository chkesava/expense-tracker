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
  upiId: string;
  bottomNavTabs: {
    home: boolean;
    expenses: boolean;
    split: boolean;
    subscriptions: boolean;
    analytics: boolean;
    settings: boolean;
  };
  dashboardWidgets: {
    subscriptions: boolean;
    focus: boolean;
    gamification: boolean;
    topCategories: boolean;
  };
  dashboardOrder: string[];
  navigationStyle: "bottom" | "dock";
};

export const DEFAULTS: Settings = {
  lockPastMonths: true,
  compactListMode: false,
  defaultCategory: "Food",
  defaultView: "dashboard",
  exportYear: new Date().getFullYear(),
  monthlyBudget: 0,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  upiId: "",
  bottomNavTabs: {
    home: true,
    expenses: true,
    split: true,
    subscriptions: true,
    analytics: true,
    settings: true,
  },
  dashboardWidgets: {
    subscriptions: true,
    focus: true,
    gamification: true,
    topCategories: true,
  },
  dashboardOrder: ["focus", "gamification", "subscriptions", "topCategories", "overview", "quickAdd", "insight", "budgetAlerts", "financialGoals", "recentActivity"],
  navigationStyle: "bottom",
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
  toggleBottomNavTab: (key: keyof Settings["bottomNavTabs"]) => void;
  toggleDashboardWidget: (key: keyof Settings["dashboardWidgets"]) => void;
  setDashboardOrder: (order: string[]) => void;
  setNavigationStyle: (val: Settings["navigationStyle"]) => void;
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

    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings({
          ...DEFAULTS,
          ...data,
          bottomNavTabs: {
            ...DEFAULTS.bottomNavTabs,
            ...(data.bottomNavTabs || {}),
          },
          dashboardWidgets: {
            ...DEFAULTS.dashboardWidgets,
            ...(data.dashboardWidgets || {}),
          },
          dashboardOrder: data.dashboardOrder || DEFAULTS.dashboardOrder,
        } as Settings);
      } else {
        setDoc(ref, DEFAULTS, { merge: true }).catch(console.error);
        setSettings(DEFAULTS);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const updateSettings = async (updates: Partial<Settings>) => {
    if (!user) return;
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
  const setUpiId = (val: string) => updateSettings({ upiId: val });
  
  const toggleBottomNavTab = (key: keyof Settings["bottomNavTabs"]) => {
    const newTabs = { ...settings.bottomNavTabs, [key]: !settings.bottomNavTabs[key] };
    updateSettings({ bottomNavTabs: newTabs });
  };

  const toggleDashboardWidget = (key: keyof Settings["dashboardWidgets"]) => {
    const newWidgets = { ...settings.dashboardWidgets, [key]: !settings.dashboardWidgets[key] };
    updateSettings({ dashboardWidgets: newWidgets });
  };

  const setDashboardOrder = (order: string[]) => updateSettings({ dashboardOrder: order });
  const setNavigationStyle = (val: Settings["navigationStyle"]) => updateSettings({ navigationStyle: val });

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
        toggleBottomNavTab,
        toggleDashboardWidget,
        setDashboardOrder,
        setNavigationStyle,
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
