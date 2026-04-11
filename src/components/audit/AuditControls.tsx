import { Check, X, Tag, Edit2 } from "lucide-react";
import { motion } from "framer-motion";

interface AuditControlsProps {
  onAction: (action: "keep" | "edit" | "categorize") => void;
}

export default function AuditControls({ onAction }: AuditControlsProps) {
  return (
    <div className="flex items-center gap-6">
      {/* Edit (Left Swipe) */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onAction("edit")}
        className="w-14 h-14 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10"
      >
        <Edit2 size={24} />
      </motion.button>

      {/* Categorize (Up Swipe) */}
      <motion.button
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.8 }}
        onClick={() => onAction("categorize")}
        className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/30 -mt-4 border-4 border-white dark:border-slate-950"
      >
        <Tag size={32} />
      </motion.button>

      {/* Keep (Right Swipe) */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onAction("keep")}
        className="w-14 h-14 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/10"
      >
        <Check size={28} />
      </motion.button>
    </div>
  );
}
