import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar } from "lucide-react";
import { useModals } from "../hooks/useModals";
import { useExpenses } from "../hooks/useExpenses";
import { useMemo } from "react";
import { cn } from "../lib/utils";

export default function MonthDrawer() {
  const { isMonthDrawerOpen, setIsMonthDrawerOpen, globalMonth, setGlobalMonth } = useModals();
  const expenses = useExpenses();

  const months = useMemo(() => {
    const allMonths = [...new Set(expenses.map((e) => e.month))].sort().reverse();
    // Ensure current month is always there if data exists
    const current = new Date().toISOString().slice(0, 7);
    if (allMonths.length === 0) return [current];
    return allMonths;
  }, [expenses]);

  const selectedMonth = globalMonth ?? months[0] ?? "";

  return (
    <AnimatePresence>
      {isMonthDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-start p-4 sm:p-6 pt-20">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMonthDrawerOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
          />

          {/* Drawer Content */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="relative w-full max-w-lg bg-white/90 dark:bg-slate-900/95 rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-slate-800 p-8 pt-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Select Month</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter your view</p>
                </div>
              </div>
              <button
                onClick={() => setIsMonthDrawerOpen(false)}
                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {months.map((month) => {
                const isActive = month === selectedMonth;
                return (
                  <button
                    key={month}
                    onClick={() => {
                      setGlobalMonth(month);
                      setIsMonthDrawerOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-center p-4 rounded-3xl font-bold text-sm transition-all active:scale-95",
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    )}
                  >
                    {new Date(month + "-01").toLocaleDateString(undefined, { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
