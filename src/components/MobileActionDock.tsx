import { useState } from "react";
import { Menu } from "lucide-react";
import { motion } from "framer-motion";
import { useModals } from "../hooks/useModals";
import SideDrawer from "./SideDrawer";
import AddFab from "./ui/AddFab";
import { ICON_SIZE, ICON_STROKE } from "../lib/iconSizes";

export default function MobileActionDock() {
  const { setIsAddExpenseOpen } = useModals();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <div className="mobile-action-dock pointer-events-none fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-[100] flex items-center justify-center gap-4 px-4 transition-all duration-300 sm:gap-6 sm:px-6 md:hidden">
        <AddFab
          size="lg"
          className="pointer-events-auto border-4 border-background/80"
          onClick={() => setIsAddExpenseOpen(true)}
          aria-label="Add transaction"
        />

        <motion.button
          type="button"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsMenuOpen(true)}
          className="pointer-events-auto absolute right-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-border bg-card text-foreground shadow-lg sm:right-6"
          aria-label="Open navigation menu"
        >
          <Menu size={ICON_SIZE.lg} strokeWidth={ICON_STROKE} />
        </motion.button>
      </div>

      <SideDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
}
