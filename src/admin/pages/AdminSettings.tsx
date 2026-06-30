import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";
import { AlertTriangle, Sparkles, Download, Globe } from "lucide-react";

interface SystemSettings {
    maintenanceMode: boolean;
    disableSignups: boolean;
    announcementBanner: string;
    defaultCurrency: string;
    enableAIFeatures: boolean;
    allowDataExport: boolean;
}

import { useSystemSettings } from "../../hooks/useSystemSettings";

const CURRENCIES = [
    { code: "INR", label: "🇮🇳 Indian Rupee (₹)" },
    { code: "USD", label: "🇺🇸 US Dollar ($)" },
    { code: "EUR", label: "🇪🇺 Euro (€)" },
    { code: "GBP", label: "🇬🇧 British Pound (£)" },
    { code: "JPY", label: "🇯🇵 Japanese Yen (¥)" },
    { code: "AUD", label: "🇦🇺 Australian Dollar (A$)" },
    { code: "CAD", label: "🇨🇦 Canadian Dollar (C$)" },
    { code: "SGD", label: "🇸🇬 Singapore Dollar (S$)" },
    { code: "AED", label: "🇦🇪 UAE Dirham (د.إ)" },
];

export default function AdminSettings() {
    const { settings, loading } = useSystemSettings();
    const [localBanner, setLocalBanner] = useState("");
    
    // Sync local banner state when settings load
    useEffect(() => {
        if (!loading && settings) {
            setLocalBanner(settings.announcementBanner || "");
        }
    }, [loading, settings?.announcementBanner]);

    const updateSetting = async (key: string, value: any) => {
        try {
            const docRef = doc(db, "system_settings", "global");
            await setDoc(docRef, { [key]: value }, { merge: true });
            // Only toast for the announcement banner, as toggles provide instant visual feedback
            if (key === 'announcementBanner') {
                toast.success("Settings saved successfully");
            }
        } catch (error) {
            console.error("Error saving setting:", error);
            toast.error("Failed to save setting.");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-blue-600 mb-4"></div>
                <p className="text-slate-500 font-medium">Loading settings...</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl"
        >
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Settings</h1>
                    <p className="text-slate-500 mt-1">Changes are saved automatically.</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Core Features */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-lg font-bold text-slate-900">Access Control</h2>
                        <p className="text-sm text-slate-500">Manage who can access the application.</p>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900">Maintenance Mode</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    When enabled, only Super Admins can access the application. Regular users will see a maintenance screen.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.maintenanceMode}
                                    onChange={(e) => updateSetting("maintenanceMode", e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        {settings.maintenanceMode && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start">
                                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                                <p className="text-sm text-amber-800">
                                    <strong>Warning:</strong> Enabling Maintenance Mode will prevent non-admins from loading the app. They won't be disconnected immediately if already logged in, but navigation might fail.
                                </p>
                            </div>
                        )}

                        <hr className="border-slate-100" />

                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900">Disable New Signups</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Prevent new users from registering. Existing users can still log in.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.disableSignups}
                                    onChange={(e) => updateSetting("disableSignups", e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Optional Configuration */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-lg font-bold text-slate-900">Global Announcements</h2>
                        <p className="text-sm text-slate-500">Show a persistent banner at the top of the app for all users.</p>
                    </div>
                    <div className="p-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Announcement Text (Optional)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={localBanner}
                                onChange={(e) => setLocalBanner(e.target.value)}
                                placeholder="e.g., Scheduled maintenance on Saturday at 2 AM UTC."
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                                onClick={() => updateSetting("announcementBanner", localBanner)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Publish
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Leave blank and click Publish to hide the banner.</p>
                    </div>
                </div>
                {/* Feature Flags */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-lg font-bold text-slate-900">Feature Flags</h2>
                        <p className="text-sm text-slate-500">Enable or disable key application features globally.</p>
                    </div>
                    <div className="p-6 space-y-6">

                        {/* Default Currency */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 p-2 bg-blue-50 rounded-lg">
                                    <Globe className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-slate-900">Default Currency</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">The default currency shown for new users and global displays.</p>
                                </div>
                            </div>
                            <select
                                value={settings.defaultCurrency}
                                onChange={(e) => updateSetting("defaultCurrency", e.target.value)}
                                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[210px]"
                            >
                                {CURRENCIES.map(c => (
                                    <option key={c.code} value={c.code}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        <hr className="border-slate-100" />

                        {/* AI Features */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 p-2 bg-purple-50 rounded-lg">
                                    <Sparkles className="w-4 h-4 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-slate-900">AI Features (Magic Advisor)</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">Enable or disable the AI-powered advisor chatbot for all users. Disable to control API costs.</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.enableAIFeatures}
                                    onChange={(e) => updateSetting("enableAIFeatures", e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Allow Data Export */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 p-2 bg-green-50 rounded-lg">
                                    <Download className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-slate-900">Allow Data Export</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">Allow regular users to export their expenses and reports as CSV or PDF.</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.allowDataExport}
                                    onChange={(e) => updateSetting("allowDataExport", e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                            </label>
                        </div>

                    </div>
                </div>

            </div>
        </motion.div>
    );
}
