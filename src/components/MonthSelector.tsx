import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar } from "lucide-react";
import { cn } from "../lib/utils";

interface Props {
  months: string[];
  value: string;
  onChange: (month: string) => void;
}

export default function MonthSelector({ months, value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div className="fixed bottom-28 right-4 z-[999] md:bottom-6 md:right-6" ref={containerRef}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full right-0 mb-2 w-44 bg-card border border-border rounded-xl shadow-card-hover overflow-hidden py-1 max-h-64 overflow-y-auto scrollbar-thin"
          >
            {months.map((month) => (
              <button
                key={month}
                type="button"
                onClick={() => {
                  onChange(month);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-between",
                  month === value ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                )}
              >
                {month}
                {month === value && <span className="text-primary text-xs">●</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-xl border shadow-card transition-colors",
          isOpen
            ? "bg-gradient-primary text-primary-foreground border-primary shadow-glow"
            : "bg-card text-foreground border-border hover:bg-muted/50"
        )}
      >
        <Calendar size={18} className="text-muted-foreground" />
        <div className="flex flex-col items-start leading-none">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Month</span>
          <span className="text-xs font-semibold">{value}</span>
        </div>
      </button>
    </div>
  );
}
