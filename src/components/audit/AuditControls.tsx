import { Check, Tag, Edit2 } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../lib/utils";

interface AuditControlsProps {
  onAction: (action: "keep" | "edit" | "categorize") => void;
}

export default function AuditControls({ onAction }: AuditControlsProps) {
  const { theme } = useTheme();
  const isClay = theme === "claymorphism";

  return (
    <div className="flex items-center gap-6">
      {/* Edit (Left Swipe) */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onAction("edit")}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
          isClay
            ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-[inset_1px_1px_2px_rgba(255,255,255,0.4),0_8px_16px_rgba(245,158,11,0.25)] border-0"
            : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-500 shadow-lg shadow-amber-500/10"
        )}
        aria-label="Edit transaction"
      >
        <Edit2 size={24} />
      </motion.button>

      {/* Categorize (Up Swipe) */}
      <motion.button
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.8 }}
        onClick={() => onAction("categorize")}
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 -mt-4",
          isClay
            ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-[inset_1px_1.5px_3px_rgba(255,255,255,0.4),0_12px_24px_rgba(99,102,241,0.35)] border-0"
            : "bg-blue-600 text-white shadow-xl shadow-blue-500/30 border-4 border-white dark:border-slate-950"
        )}
        aria-label="Categorize transaction"
      >
        <Tag size={32} />
      </motion.button>

      {/* Keep (Right Swipe) */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onAction("keep")}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
          isClay
            ? "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-[inset_1px_1px_2px_rgba(255,255,255,0.4),0_8px_16px_rgba(16,185,129,0.25)] border-0"
            : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-emerald-500 shadow-lg shadow-emerald-500/10"
        )}
        aria-label="Keep transaction"
      >
        <Check size={28} />
      </motion.button>
    </div>
  );
}
