import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useSystemSettings } from "../hooks/useSystemSettings";

export default function AnnouncementBanner() {
    const { settings, loading } = useSystemSettings();
    const [isVisible, setIsVisible] = useState(true);

    // Reset visibility when the announcement text changes
    useEffect(() => {
        setIsVisible(true);
    }, [settings?.announcementBanner]);

    if (loading || !settings?.announcementBanner || !isVisible) {
        return null;
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white px-4 py-3 relative z-50 overflow-hidden shadow-lg border-b border-white/10"
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
                    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                        <div className="flex flex-1 items-center gap-3">
                            <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-200" />
                            <p className="text-sm font-medium leading-tight">
                                {settings.announcementBanner}
                            </p>
                        </div>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="p-1 rounded-md hover:bg-blue-700/50 transition-colors flex-shrink-0 text-blue-200 hover:text-white"
                            aria-label="Dismiss banner"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
