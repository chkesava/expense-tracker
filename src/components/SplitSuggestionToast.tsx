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
  closeToast,
}) => {
  return (
    <div className="flex w-[min(92vw,22rem)] flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-foreground shadow-lg">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Users size={20} />
        </div>
        <div>
          <h4 className="text-sm font-semibold tracking-tight text-foreground">Group expense detected?</h4>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            ₹{amount.toLocaleString()} for &ldquo;{note || category}&rdquo;. Tap to split with friends.
          </p>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          onSplit({ amount, title: note || category, category });
          closeToast?.();
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        Split with Friends
        <ArrowRight size={14} />
      </motion.button>
    </div>
  );
};
