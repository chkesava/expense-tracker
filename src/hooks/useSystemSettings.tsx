import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export interface SystemSettings {
  maintenanceMode: boolean;
  disableSignups: boolean;
  announcementBanner: string;
  defaultCurrency: string;
  enableAIFeatures: boolean;
  allowDataExport: boolean;
  enableInvestments: boolean;
}

const DEFAULT_SETTINGS: SystemSettings = {
  maintenanceMode: false,
  disableSignups: false,
  announcementBanner: "",
  defaultCurrency: "INR",
  enableAIFeatures: true,
  allowDataExport: true,
  enableInvestments: true,
};

type SystemSettingsContextType = {
  settings: SystemSettings;
  loading: boolean;
};

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(
  undefined
);

/**
 * Single shared listener for `system_settings/global`.
 * Prevents N× onSnapshot fan-out from Amount and other consumers.
 */
export function SystemSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "system_settings", "global"),
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() });
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching system settings:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const value = useMemo(
    () => ({ settings, loading }),
    [settings, loading]
  );

  return (
    <SystemSettingsContext.Provider value={value}>
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings() {
  const context = useContext(SystemSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useSystemSettings must be used within a SystemSettingsProvider"
    );
  }
  return context;
}
