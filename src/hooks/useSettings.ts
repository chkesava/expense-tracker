import { useEffect, useState } from "react";

type Settings = {
  lockPastMonths: boolean;
  compactListMode: boolean;
  defaultCategory: string;
  defaultView: "add" | "expenses" | "analytics" | "dashboard";
  exportYear: number;
  monthlyBudget: number;
};

const DEFAULTS: Settings = {
  lockPastMonths: true,
  compactListMode: false,
  defaultCategory: "Food",
  defaultView: "dashboard",
  exportYear: new Date().getFullYear(),
  monthlyBudget: 0,
};

export default function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem("appSettings");
      return raw ? (JSON.parse(raw) as Settings) : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("appSettings", JSON.stringify(settings));
    } catch (e) {
      /* ignore */
    }
  }, [settings]);

  const setLockPastMonths = (val: boolean) => setSettings((s) => ({ ...s, lockPastMonths: val }));
  const setCompactListMode = (val: boolean) => setSettings((s) => ({ ...s, compactListMode: val }));
  const setDefaultCategory = (val: string) => setSettings((s) => ({ ...s, defaultCategory: val }));
  const setDefaultView = (val: Settings["defaultView"]) => setSettings((s) => ({ ...s, defaultView: val }));
  const setExportYear = (val: number) => setSettings((s) => ({ ...s, exportYear: val }));
  const setMonthlyBudget = (val: number) => setSettings((s) => ({ ...s, monthlyBudget: val }));

  return {
    settings,
    setLockPastMonths,
    setCompactListMode,
    setDefaultCategory,
    setDefaultView,
    setExportYear,
    setMonthlyBudget,
  };
}
