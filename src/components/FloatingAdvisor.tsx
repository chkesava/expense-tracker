import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import MagicChatEntry from "./MagicChatEntry";
import { cn } from "../lib/utils";
import { useSystemSettings } from "../hooks/useSystemSettings";
import { useModals } from "../hooks/useModals";

export default function FloatingAdvisor() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useSystemSettings();
  const { isAddExpenseOpen, editingExpense, editingIncome } = useModals();

  // Respect the global AI Features toggle set by Super Admin
  if (!settings.enableAIFeatures) return null;

  // Hide the AI advisor when the transaction entry modal/popup is open
  if (isAddExpenseOpen || editingExpense || editingIncome) return null;

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-[136px] right-6 md:bottom-8 md:right-8 z-[200]">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "relative w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 pointer-events-auto",
            isOpen
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-slate-800"
              : "bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-blue-500/30"
          )}
          aria-label={isOpen ? "Close AI Advisor" : "Open AI Advisor"}
        >
          {/* Glowing Aura Effect when closed */}
          {!isOpen && (
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 blur-[8px] opacity-40 animate-pulse -z-10" />
          )}

          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X size={24} />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center"
              >
                <Sparkles size={24} className="animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Floating Chat Modal Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-[200px] right-4 left-4 sm:left-auto sm:right-6 md:bottom-26 md:right-8 w-auto sm:w-[440px] z-[190] pointer-events-auto"
          >
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/80 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.4)] overflow-hidden">
              
              {/* Popup Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                    <Sparkles size={16} className="animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                      Magic Advisor
                    </h4>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                        AI Online
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label="Close chat"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Chat Widget Body */}
              <div className="p-3">
                <MagicChatEntry defaultMode="advisor" hideModeSwitcher={true} />
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
