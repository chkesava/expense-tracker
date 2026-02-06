import { motion } from "framer-motion";
import { useGamification } from "../hooks/useGamification";
import { LEVEL_THRESHOLDS } from "../types/stats";
import { cn } from "../lib/utils";

export default function GamificationCard() {
    const { stats, loading } = useGamification();

    if (loading) return null;

    // Calculate progress to next level
    const currentLevelThreshold = LEVEL_THRESHOLDS[stats.level as keyof typeof LEVEL_THRESHOLDS] || 0;
    const nextLevelThreshold = LEVEL_THRESHOLDS[(stats.level + 1) as keyof typeof LEVEL_THRESHOLDS] || 10000;

    const progress = Math.min(
        100,
        ((stats.points - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100
    );

    // Get last month's stats for comparison
    const today = new Date();
    today.setDate(0); // Go to last day of prev month
    const lastMonthStr = today.toISOString().slice(0, 7);
    const lastMonthStats = stats.monthlyRecords?.[lastMonthStr];

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="relative overflow-hidden rounded-[2rem] p-1 mb-6"
        >
            {/* Animated Border Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/0 to-white/40 opacity-50 pointer-events-none" />

            <div className={cn(
                "relative backdrop-blur-3xl bg-gradient-to-br from-indigo-600/90 via-purple-700/80 to-indigo-900/90",
                "rounded-[1.9rem] p-6 text-white shadow-2xl border border-white/20",
                "overflow-hidden"
            )}>

                {/* Floating Background Orbs */}
                <motion.div
                    animate={{ x: [0, 30, 0], y: [0, -30, 0], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500 rounded-full blur-[80px]"
                />
                <motion.div
                    animate={{ x: [0, -20, 0], y: [0, 20, 0], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500 rounded-full blur-[80px]"
                />

                {/* Header: Level & Points */}
                <div className="relative z-10 flex justify-between items-start mb-6">
                    <div>
                        <motion.h3
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-indigo-100 font-semibold text-xs tracking-[0.2em] uppercase mb-1"
                        >
                            Level {stats.level}
                        </motion.h3>
                        <div className="flex items-end gap-3">
                            <motion.span
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                                className="text-4xl font-black bg-gradient-to-br from-white to-blue-200 bg-clip-text text-transparent filter drop-shadow-sm"
                            >
                                {stats.points.toLocaleString()} <span className="text-lg">XP</span>
                            </motion.span>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="relative z-10 mb-6">
                    <div className="flex justify-between text-xs font-medium text-blue-100/80 mb-2">
                        <span>Next Level</span>
                        <span>{Math.floor(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                            className="h-full bg-gradient-to-r from-blue-400 to-cyan-300 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)] relative overflow-hidden"
                        >
                            <motion.div
                                className="absolute top-0 bottom-0 left-0 w-full bg-white/30 skew-x-[-20deg]"
                                initial={{ x: "-100%" }}
                                animate={{ x: "200%" }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            />
                        </motion.div>
                    </div>
                </div>

                {/* DUAL STATS: Shields vs Fires */}
                <div className="relative z-10 grid grid-cols-2 gap-3">
                    {/* SHIELDS CARD */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-white/10 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center relative backdrop-blur-md"
                    >
                        <div className="text-3xl mb-1 drop-shadow-md">🛡️</div>
                        <div className="text-2xl font-bold">{stats.shields || 0}</div>
                        <div className="text-[10px] uppercase tracking-wider text-blue-200 font-semibold">Active Shield</div>

                        {lastMonthStats && (
                            <div className="absolute -top-2 -right-2 bg-blue-500/80 text-[9px] px-1.5 py-0.5 rounded-full border border-white/20">
                                Last Best: {lastMonthStats.maxShields}
                            </div>
                        )}
                    </motion.div>

                    {/* FIRES CARD */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-white/10 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center relative backdrop-blur-md"
                    >
                        <div className="text-3xl mb-1 drop-shadow-md">🔥</div>
                        <div className="text-2xl font-bold">{stats.fires || 0}</div>
                        <div className="text-[10px] uppercase tracking-wider text-orange-200 font-semibold">Spending Spree</div>

                        {lastMonthStats && (
                            <div className="absolute -top-2 -right-2 bg-orange-500/80 text-[9px] px-1.5 py-0.5 rounded-full border border-white/20">
                                Last High: {lastMonthStats.maxFires}
                            </div>
                        )}
                    </motion.div>
                </div>

            </div>
        </motion.div>
    );
}
