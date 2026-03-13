import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Target, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useFocusMode } from "../../hooks/useFocusMode";
import { cn } from "../../lib/utils";

export default function FocusWidget({ onOpenConfig }: { onOpenConfig: () => void }) {
  const { activeFocus, checkDailySpend, cancelFocus } = useFocusMode();
  const [dailySpend, setDailySpend] = useState(0);

  useEffect(() => {
    if (activeFocus) {
      checkDailySpend().then(setDailySpend);
    }
  }, [activeFocus, checkDailySpend]);

  if (!activeFocus) {
    return (
      <button
        type="button"
        onClick={onOpenConfig}
        className="w-full bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between hover:from-primary/15 hover:to-accent/15 hover:shadow-glow hover:border-primary/30 transition-all text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-glow">
            <Target size={20} />
          </span>
          <div>
            <h3 className="font-medium text-foreground text-sm">Focus mode</h3>
            <p className="text-xs text-muted-foreground">Set a daily limit and earn XP</p>
          </div>
        </div>
      </button>
    );
  }

  const percentage = Math.min(100, (dailySpend / activeFocus.dailyLimit) * 100);
  const isOverLimit = dailySpend > activeFocus.dailyLimit;
  const daysLeft = Math.ceil(
    (new Date(activeFocus.endDate).getTime() - Date.now()) / (1000 * 3600 * 24)
  );

  return (
    <div className="bg-card-gradient border border-border rounded-xl p-4 shadow-card">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-md">
              {activeFocus.category}
            </span>
            <span className="text-xs text-muted-foreground">{daysLeft} days left</span>
          </div>
          <h3 className="font-medium text-foreground text-sm">Daily goal</h3>
        </div>
        {isOverLimit ? (
          <AlertTriangle className="text-destructive size-5" />
        ) : (
          <CheckCircle2 className="text-success size-5" />
        )}
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-sm font-medium text-foreground mb-1.5">
          <span>₹{dailySpend.toLocaleString()}</span>
          <span className="text-muted-foreground">/ ₹{activeFocus.dailyLimit.toLocaleString()}</span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              isOverLimit ? "bg-destructive" : "bg-success"
            )}
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {isOverLimit ? "Over today’s limit" : "On track"}
        </p>
        <button
          type="button"
          onClick={cancelFocus}
          className="text-xs font-medium text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors"
        >
          End focus
        </button>
      </div>
    </div>
  );
}
