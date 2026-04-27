import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import { motion } from "framer-motion";
import { useUserRole } from "../hooks/useUserRole";
import useSettings from "../hooks/useSettings";
import { useModals } from "../hooks/useModals";
import { BarChart3, Home, Plus, Settings, Wallet, Users, RefreshCw, Search } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();
  const { isAdmin } = useUserRole();
  const { settings } = useSettings();
  const { setIsAddExpenseOpen } = useModals();

  const allLinks = [
    { id: "home", path: "/dashboard", label: "Home", icon: Home },
    { id: "expenses", path: "/expenses", label: "Expenses", icon: Wallet },
    { id: "add", path: "#add", label: "Add", icon: Plus, isAction: true },
    { id: "split", path: "/split", label: "Split", icon: Users },
    { id: "subscriptions", path: "/subscriptions", label: "Subs", icon: RefreshCw },
    { id: "analytics", path: "/analytics", label: "Stats", icon: BarChart3 },
    { id: "analysis", path: "/analysis", label: "Search", icon: Search },
    { id: "settings", path: "/settings", label: "Settings", icon: Settings },
  ];

  // Filter navigation links (excluding the action)
  const navLinks = allLinks.filter(link => 
    !link.isAction && (settings.bottomNavTabs as any)[link.id] !== false
  );

  // Split links into two groups for centering the Plus button
  const mid = Math.ceil(navLinks.length / 2);
  const leftLinks = navLinks.slice(0, mid);
  const rightLinks = navLinks.slice(mid);
  const actionLink = allLinks.find(l => l.isAction)!;

  const renderLink = (link: typeof allLinks[0]) => {
    const isActive = location.pathname === link.path;
    const Icon = link.icon;

    return (
      <NavLink
        key={link.id}
        to={link.path}
        className={({ isActive }) => cn(
          "relative flex flex-col items-center justify-center py-2 px-1 flex-1 min-w-0 transition-all duration-500",
          isActive ? "text-primary" : "text-slate-400 dark:text-slate-500"
        )}
      >
        {isActive && (
          <motion.div
            layoutId="bottom-nav-active-bg"
            className="absolute inset-0 bg-primary/5 dark:bg-primary/10 rounded-[1.5rem] -z-10"
            initial={false}
            transition={{ type: "spring", bounce: 0.3, duration: 0.8 }}
          />
        )}
        <Icon 
          size={22} 
          strokeWidth={isActive ? 2.5 : 2}
          className={cn(
            "transition-all duration-500",
            isActive ? "scale-110 drop-shadow-[0_0_12px_rgba(var(--primary),0.4)]" : "scale-100"
          )} 
        />
        <span className={cn(
          "text-[10px] font-black mt-1 transition-all duration-500 tracking-tighter uppercase",
          isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
        )}>
          {link.label}
        </span>
        
        {isActive && (
          <motion.div
            layoutId="bottom-nav-indicator"
            className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]"
            transition={{ type: "spring", bounce: 0.3, duration: 0.8 }}
          />
        )}
      </NavLink>
    );
  };

  const ActionIcon = actionLink.icon;

  return (
    <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-0 w-full flex justify-center z-[100] px-3 sm:px-4 pointer-events-none md:hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
      <nav className="premium-glass rounded-[3rem] px-3 py-2 shadow-2xl pointer-events-auto flex items-center justify-between gap-1 w-full max-w-[480px] transition-all duration-500">
        {/* Left Nav Group */}
        {leftLinks.map(renderLink)}

        {/* Center Plus Button */}
        <button
          key={actionLink.id}
          onClick={() => setIsAddExpenseOpen(true)}
          className="relative flex flex-col items-center justify-center p-1 flex-1 min-w-0 group"
        >
          <motion.div
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 rounded-[1.5rem] bg-gradient-to-br from-primary via-primary to-indigo-600 text-white flex items-center justify-center shadow-xl shadow-primary/20 shine-effect"
          >
            <ActionIcon size={28} strokeWidth={3} />
          </motion.div>
        </button>

        {/* Right Nav Group */}
        {rightLinks.map(renderLink)}
      </nav>
    </div>
  );
}
