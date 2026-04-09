import { motion, AnimatePresence } from "framer-motion";
import { useCelebration, type CelebrationType } from "../hooks/useCelebration";
import { Sparkles, Trophy, Shield, Flame, Target } from "lucide-react";
import { useState, useEffect } from "react";

const Particles = ({ count = 20 }: { count?: number }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 1, 
            scale: 0, 
            x: "50%", 
            y: "50%",
            rotate: 0 
          }}
          animate={{ 
            opacity: 0, 
            scale: Math.random() * 2 + 1, 
            x: `${Math.random() * 100}%`, 
            y: `${Math.random() * 100}%`,
            rotate: Math.random() * 360 
          }}
          transition={{ 
            duration: 2, 
            ease: "easeOut",
            repeat: Infinity,
            repeatDelay: Math.random() * 2 
          }}
          className="absolute w-2 h-2 rounded-full bg-blue-500/30 dark:bg-blue-400/30"
          style={{
            backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`
          }}
        />
      ))}
    </div>
  );
};

const CelebrationContent = ({ type }: { type: CelebrationType }) => {
  const configs: Record<CelebrationType, { icon: any, title: string, subtitle: string, color: string }> = {
    'confetti': { icon: Sparkles, title: "Amazing!", subtitle: "Great job on your progress", color: "from-yellow-400 to-orange-500" },
    'level-up': { icon: Trophy, title: "Level Up!", subtitle: "You're reaching new heights", color: "from-indigo-500 to-purple-600" },
    'streak-shield': { icon: Shield, title: "Saving Streak!", subtitle: "Shield increased! Keep saving.", color: "from-blue-500 to-indigo-600" },
    'streak-fire': { icon: Flame, title: "On Fire!", subtitle: "Tracking streak active!", color: "from-orange-500 to-red-600" },
    'focus-win': { icon: Target, title: "Focus Won!", subtitle: "You stayed within your budget!", color: "from-emerald-500 to-teal-600" },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.5, opacity: 0, y: 20 }}
      className="relative z-50 text-center"
    >
      <motion.div
        animate={{ 
          rotate: [0, 10, -10, 10, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 1, repeat: Infinity }}
        className={`w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br ${config.color} text-white flex items-center justify-center shadow-2xl shadow-blue-500/20`}
      >
        <Icon size={48} strokeWidth={2.5} />
      </motion.div>
      <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">
        {config.title}
      </h2>
      <p className="text-lg font-bold text-slate-500 dark:text-slate-400">
        {config.subtitle}
      </p>
    </motion.div>
  );
};

export default function CelebrationOverlay() {
  const { activeCelebration, clearCelebration } = useCelebration();

  return (
    <AnimatePresence>
      {activeCelebration && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 touch-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={clearCelebration}
            className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl"
          />

          <Particles count={40} />
          
          <CelebrationContent type={activeCelebration} />
        </div>
      )}
    </AnimatePresence>
  );
}
