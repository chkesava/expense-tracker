import { motion } from "framer-motion";
import { useGamification } from "../hooks/useGamification";
import { LEVEL_THRESHOLDS } from "../types/stats";
import { Shield, Flame } from "lucide-react";

export default function GamificationCard() {
  const { stats, loading } = useGamification();

  if (loading) return null;

  const currentLevelThreshold =
    LEVEL_THRESHOLDS[stats.level as keyof typeof LEVEL_THRESHOLDS] ?? 0;
  const nextLevelThreshold =
    LEVEL_THRESHOLDS[(stats.level + 1) as keyof typeof LEVEL_THRESHOLDS] ?? 10000;
  const progress = Math.min(
    100,
    ((stats.points - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100
  );

  const today = new Date();
  today.setDate(0);
  const lastMonthStr = today.toISOString().slice(0, 7);
  const lastMonthStats = stats.monthlyRecords?.[lastMonthStr];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-card-gradient border border-border rounded-xl p-4 shadow-card"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Level {stats.level}</p>
          <p className="text-2xl font-semibold text-foreground">{stats.points.toLocaleString()} XP</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1.5">
          <span>Next level</span>
          <span>{Math.floor(progress)}%</span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-gradient-primary rounded-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/50 border border-border rounded-lg p-3 text-center">
          <Shield className="size-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-lg font-semibold text-foreground">{stats.shields ?? 0}</p>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Shields</p>
          {lastMonthStats != null && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Best: {lastMonthStats.maxShields}</p>
          )}
        </div>
        <div className="bg-muted/50 border border-border rounded-lg p-3 text-center">
          <Flame className="size-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-lg font-semibold text-foreground">{stats.fires ?? 0}</p>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Spree</p>
          {lastMonthStats != null && (
            <p className="text-[10px] text-muted-foreground mt-0.5">High: {lastMonthStats.maxFires}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
