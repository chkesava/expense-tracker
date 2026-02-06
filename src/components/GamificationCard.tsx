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

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="relative overflow-hidden rounded-[2rem] p-1"
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

                {/* Level & Points Header */}
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <motion.h3
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-indigo-100 font-semibold text-xs tracking-[0.2em] uppercase mb-1"
                        >
                            Current Level
                        </motion.h3>
                        <div className="flex items-end gap-3">
                            <motion.span
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                                className="text-5xl font-black bg-gradient-to-br from-white to-blue-200 bg-clip-text text-transparent filter drop-shadow-sm"
                            >
                                {stats.level}
                            </motion.span>
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="mb-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs font-semibold shadow-inner"
                            >
                                {stats.points.toLocaleString()} XP
                            </motion.div>
                        </div>
                    </div>

                    {/* Streak Badge */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex flex-col items-center bg-gradient-to-b from-orange-400/20 to-orange-600/20 border border-orange-200/30 rounded-2xl p-3 backdrop-blur-md shadow-lg"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-2xl drop-shadow-[0_0_10px_rgba(255,165,0,0.5)]"
                        >
                            🔥
                        </motion.div>
                        <span className="text-sm font-bold mt-1 shadow-black/20 drop-shadow-md">{stats.currentStreak} Days</span>
                    </motion.div>
                </div>

                {/* Progress Bar */}
                <div className="relative z-10 mt-8">
                    <div className="flex justify-between text-xs font-medium text-blue-100/80 mb-2">
                        <span>Progress to Level {stats.level + 1}</span>
                        <span>{Math.floor(progress)}%</span>
                    </div>
                    <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
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

                {/* Badges Row (if any) */}
                {stats.badges.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="relative z-10 mt-6 pt-4 border-t border-white/10 flex gap-2 overflow-x-auto pb-2 scrollbar-none"
                    >
                        {stats.badges.map((badge, i) => (
                            <motion.div
                                key={badge}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.8 + (i * 0.1) }}
                                className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-lg backdrop-blur-md"
                                title={badge}
                            >
                                {badge.includes('streak') ? '🔥' : badge.includes('spend') ? '🛡️' : '🏅'}
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}
