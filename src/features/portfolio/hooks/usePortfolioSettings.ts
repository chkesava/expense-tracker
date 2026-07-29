import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { db } from "../../../firebase";
import type { PortfolioSettings } from "../types";
import { useAuth } from "../../../hooks/useAuth";

const SETTINGS_DOC_ID = "config";

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}

export function usePortfolioSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PortfolioSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    const ref = doc(db, "users", user.uid, "portfolioSettings", SETTINGS_DOC_ID);
    const safetyTimer = setTimeout(() => setLoading(false), 8_000);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        clearTimeout(safetyTimer);
        if (snap.exists()) {
          setSettings({ id: snap.id, ...snap.data() } as PortfolioSettings);
        } else {
          setSettings(null);
        }
        setLoading(false);
      },
      (err) => {
        clearTimeout(safetyTimer);
        console.error("usePortfolioSettings error:", err);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      unsub();
    };
  }, [user]);

  const saveOnboarding = async (data: {
    initialInvestmentAmount?: number;
    hasExistingHoldings?: boolean;
  }) => {
    if (!user) return false;
    try {
      const ref = doc(db, "users", user.uid, "portfolioSettings", SETTINGS_DOC_ID);
      const existing = await getDoc(ref);
      const payload = stripUndefined({
        ...(data.initialInvestmentAmount !== undefined
          ? {
              initialInvestmentAmount: data.initialInvestmentAmount,
              cashBalance: data.initialInvestmentAmount,
            }
          : {}),
        ...(data.hasExistingHoldings !== undefined
          ? { hasExistingHoldings: data.hasExistingHoldings }
          : {}),
        ...(data.hasExistingHoldings === false
          ? { onboardingComplete: true }
          : {}),
        updatedAt: serverTimestamp(),
        ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
      });
      await setDoc(ref, payload, { merge: true });
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Failed to save portfolio setup");
      return false;
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "portfolioSettings", SETTINGS_DOC_ID), {
        onboardingComplete: true,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete onboarding");
    }
  };

  const updateCashBalance = async (cashBalance: number) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "portfolioSettings", SETTINGS_DOC_ID), {
        cashBalance,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
    }
  };

  return {
    settings,
    loading,
    saveOnboarding,
    completeOnboarding,
    updateCashBalance,
    needsOnboarding: !loading && !settings,
    needsImport: !loading && !!settings && !settings.onboardingComplete,
  };
}
