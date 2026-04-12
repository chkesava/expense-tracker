import { useState } from "react";
import { Plus, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useModals } from "../hooks/useModals";
import SideDrawer from "./SideDrawer";
import { cn } from "../lib/utils";

export default function MobileActionDock() {
  const { setIsAddExpenseOpen } = useModals();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <div className="mobile-action-dock fixed bottom-[calc(2rem+env(safe-area-inset-bottom))] left-0 right-0 z-[100] flex justify-center items-center gap-4 sm:gap-6 px-4 sm:px-6 md:hidden pointer-events-none transition-all duration-300">
        {/* Quick Add Button - Center */}
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsAddExpenseOpen(true)}
          className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-xl shadow-blue-500/40 pointer-events-auto border-4 border-white/20 backdrop-blur-sm"
        >
          <Plus size={32} strokeWidth={3} />
        </motion.button>

        {/* Menu Button - Right */}
        <motion.button
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsMenuOpen(true)}
          className="w-14 h-14 rounded-3xl bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white flex items-center justify-center shadow-xl shadow-slate-900/10 pointer-events-auto border border-white/60 dark:border-slate-800 backdrop-blur-2xl absolute right-4 sm:right-6"
        >
          <Menu size={24} strokeWidth={2.5} />
        </motion.button>
      </div>

      <SideDrawer 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
      />
    </>
  );
}
