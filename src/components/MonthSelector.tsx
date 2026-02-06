import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

interface Props {
  months: string[];
  value: string;
  onChange: (month: string) => void;
}

export default function MonthSelector({ months, value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!months.length) return null;

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-28 right-5 z-[999]" ref={containerRef}>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10, originX: 1, originY: 1 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute bottom-full right-0 mb-3 w-48 bg-white/90 backdrop-blur-xl border border-white/60 rounded-2xl shadow-2xl overflow-hidden py-1 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200"
            >
              {months.map((month) => (
                <button
                  key={month}
                  onClick={() => {
                    onChange(month);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-between border-b border-slate-50 last:border-0",
                    month === value
                      ? "bg-blue-50/80 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {month}
                  {month === value && (
                    <span className="text-blue-600 text-xs font-bold">●</span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "flex items-center gap-2 pl-4 pr-5 py-3 rounded-full shadow-xl transition-all border border-white/20",
            isOpen
              ? "bg-slate-800 text-white"
              : "bg-white text-slate-800"
          )}
        >
          <span className="text-lg">🗓️</span>
          <div className="flex flex-col items-start leading-none">
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Month</span>
            <span className="text-xs font-bold">{value}</span>
          </div>
        </motion.button>
      </div>
    </>
  );
}
