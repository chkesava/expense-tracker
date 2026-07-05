import { motion } from "framer-motion";
import { Wallet, Activity } from "lucide-react";
import AuraBackground from "../components/layout/AuraBackground";

interface AppSelectorProps {
  onSelect: (app: 'expense' | 'nutrition') => void;
}

export default function AppSelector({ onSelect }: AppSelectorProps) {
  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-center p-6 overflow-hidden">
      <AuraBackground />
      <div className="absolute inset-0 z-[-1] bg-background/80 backdrop-blur-sm pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
          Choose Your Space
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Select the application you want to launch. You can always switch later in the settings.
        </p>
      </motion.div>

      <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect('expense')}
          className="group relative flex flex-col items-center p-10 rounded-3xl bg-card border-2 border-border/50 hover:border-primary/50 transition-all shadow-xl overflow-hidden cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-20 w-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 shadow-inner pointer-events-none">
            <Wallet size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-2 pointer-events-none">Expense Tracker</h2>
          <p className="text-muted-foreground text-center pointer-events-none">Manage your finances, split bills, and track investments.</p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect('nutrition')}
          className="group relative flex flex-col items-center p-10 rounded-3xl bg-card border-2 border-border/50 hover:border-emerald-500/50 transition-all shadow-xl overflow-hidden cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6 shadow-inner pointer-events-none">
            <Activity size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-2 pointer-events-none">Nutrition & Fitness</h2>
          <p className="text-muted-foreground text-center pointer-events-none">Track meals, macros, workouts, and achieve health goals.</p>
        </motion.button>
      </div>
    </div>
  );
}
