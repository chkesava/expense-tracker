import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useFocusMode } from '../../hooks/useFocusMode';
import { cn } from '../../lib/utils'; // Assuming utils exists, if not I'll fix

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
            <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onOpenConfig}
                className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-6 text-white shadow-xl cursor-pointer relative overflow-hidden group mb-6"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:bg-white/20 transition-all" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-4 right-4 z-20 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-pink-500/40 animate-pulse"
                >
                    NEW
                </motion.div>

                <div className="flex justify-between items-center relative z-10">
                    <div>
                        <h3 className="font-bold text-lg mb-1">Start a Focus</h3>
                        <p className="text-indigo-100 text-sm opacity-90">Cut spending & earn XP!</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                        <Target size={24} className="text-white" />
                    </div>
                </div>
            </motion.div>
        );
    }

    const percentage = Math.min(100, (dailySpend / activeFocus.dailyLimit) * 100);
    const isOverLimit = dailySpend > activeFocus.dailyLimit;
    const daysLeft = Math.ceil((new Date(activeFocus.endDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));

    return (
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 mb-6 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-lg uppercase tracking-wider">
                            {activeFocus.category}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{daysLeft} days left</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">Daily Goal</h3>
                </div>
                {isOverLimit ? (
                    <AlertTriangle className="text-red-500" />
                ) : (
                    <CheckCircle2 className="text-emerald-500" />
                )}
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
                <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                    <span>₹{dailySpend}</span>
                    <span className="text-slate-400">/ ₹{activeFocus.dailyLimit}</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isOverLimit ? "bg-red-500" : "bg-emerald-500"
                        )}
                    />
                </div>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                    {isOverLimit ? "You've exceeded today's limit!" : "You're doing great! Keep it up."}
                </p>
                <button
                    onClick={cancelFocus}
                    className="text-xs font-bold text-red-400 hover:text-red-500 px-3 py-1 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                    Give Up
                </button>
            </div>
        </div>
    );
}
