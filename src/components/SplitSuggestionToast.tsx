import React from "react";
import { Users, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface SplitSuggestionToastProps {
  amount: number;
  note: string;
  category: string;
  onSplit: (data: { amount: number; title: string; category: string }) => void;
  closeToast?: () => void;
}

export const SplitSuggestionToast: React.FC<SplitSuggestionToastProps> = ({
  amount,
  note,
  category,
  onSplit,
  closeToast
}) => {
  return (
    <div className="flex flex-col gap-3 p-1">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
          <Users size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Group expense detected?
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            ₹{amount.toLocaleString()} for "{note || category}". Tap to split with friends.
          </p>
        </div>
      </div>
      
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          onSplit({ amount, title: note || category, category });
          if (closeToast) closeToast();
        }}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
      >
        Split with Friends
        <ArrowRight size={14} />
      </motion.button>
    </div>
  );
};
