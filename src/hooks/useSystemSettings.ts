import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

interface SystemSettings {
    maintenanceMode: boolean;
    disableSignups: boolean;
    announcementBanner: string;
    defaultCurrency: string;
    enableAIFeatures: boolean;
    allowDataExport: boolean;
}

const DEFAULT_SETTINGS: SystemSettings = {
    maintenanceMode: false,
    disableSignups: false,
    announcementBanner: "",
    defaultCurrency: "INR",
    enableAIFeatures: true,
    allowDataExport: true,
};

export function useSystemSettings() {
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

    return { settings, loading };
}
