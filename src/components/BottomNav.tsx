import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import { motion } from "framer-motion";
import { useModals } from "../hooks/useModals";
import { BarChart3, Home, Plus, Wallet, Users } from "lucide-react";
import { CORE_NAV_ITEMS, isNavItemActive } from "../config/navigation";

export default function BottomNav() {
  const location = useLocation();
  const { setIsAddExpenseOpen } = useModals();
  type ActionLink = { id: "add"; path: "#add"; label: "Add"; isAction: true };

  const iconById = {
    home: Home,
    ledger: Wallet,
    vaults: Users,
    insights: BarChart3,
  } as const;
  const navLinks = CORE_NAV_ITEMS.filter((item) => item.includeInBottomNav);
  const actionLink: ActionLink = { id: "add", path: "#add", label: "Add", isAction: true };
  const allLinks = [
    ...CORE_NAV_ITEMS.filter((item) => item.includeInBottomNav),
    actionLink,
  ];

  // Split links into two groups for centering the Plus button
  const mid = Math.ceil(navLinks.length / 2);
  const leftLinks = navLinks.slice(0, mid);
  const rightLinks = navLinks.slice(mid);
  const renderLink = (link: (typeof navLinks)[number]) => {
    const isActive = isNavItemActive(location.pathname, link.id as any);
    const Icon = iconById[link.id as keyof typeof iconById];

    return (
      <NavLink
        key={link.id}
        to={link.path}
        className={cn(
          "relative flex flex-col items-center justify-center py-2 px-1 flex-1 min-w-0 transition-all duration-500",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
        aria-label={`Go to ${link.label}`}
      >
        {isActive && (
          <motion.div
            layoutId="bottom-nav-active-bg"
            className="absolute inset-0 bg-primary/10 rounded-[1.5rem] -z-10"
            initial={false}
            transition={{ type: "spring", bounce: 0.3, duration: 0.8 }}
          />
        )}
        <Icon 
          size={22} 
          strokeWidth={isActive ? 2.5 : 2}
          className={cn(
            "transition-all duration-500",
            isActive ? "scale-110 drop-shadow-[0_0_12px_hsl(var(--primary)/0.4)]" : "scale-100"
          )} 
        />
        <span className={cn(
          "text-[10px] font-black mt-1 transition-all duration-500 tracking-tighter uppercase",
          isActive ? "opacity-100 translate-y-0" : "opacity-75 translate-y-0"
        )}>
          {link.label}
        </span>
        
        {isActive && (
          <motion.div
            layoutId="bottom-nav-indicator"
            className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
            transition={{ type: "spring", bounce: 0.3, duration: 0.8 }}
          />
        )}
      </NavLink>
    );
  };

  return (
    <div className="mobile-action-dock fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-0 w-full flex justify-center z-[100] px-3 sm:px-4 pointer-events-none md:hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
      <nav className="bento-card px-3 py-2 pointer-events-auto flex items-center justify-between gap-1 w-full max-w-[480px]">
        {/* Left Nav Group */}
        {leftLinks.map(renderLink)}

        {/* Center Plus Button */}
        <button
          key={actionLink.id}
          onClick={() => setIsAddExpenseOpen(true)}
          className="relative flex flex-col items-center justify-center p-1 flex-1 min-w-0 group"
          aria-label="Add transaction"
        >
          <motion.div
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 rounded-[1.5rem] bg-gradient-to-br from-primary via-primary to-indigo-600 text-white flex items-center justify-center shadow-xl shadow-primary/20 shine-effect"
          >
            <Plus size={28} strokeWidth={3} />
          </motion.div>
        </button>

        {/* Right Nav Group */}
        {rightLinks.map(renderLink)}
      </nav>
    </div>
  );
}
