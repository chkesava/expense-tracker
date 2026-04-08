import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import { motion } from "framer-motion";
import { useUserRole } from "../hooks/useUserRole";
import useSettings from "../hooks/useSettings";
import { BarChart3, Home, Plus, Settings, Shield, Wallet, Users, RefreshCw } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();
  const { isAdmin } = useUserRole();
  const { settings } = useSettings();

  const links = [
    { id: "home", path: "/dashboard", label: "Home", icon: Home },
    { id: "expenses", path: "/expenses", label: "Expenses", icon: Wallet },
    { id: "split", path: "/split", label: "Split", icon: Users },
    { id: "add", path: "/add", label: "Add", icon: Plus },
    { id: "subscriptions", path: "/subscriptions", label: "Subs", icon: RefreshCw },
    { id: "analytics", path: "/analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", path: "/settings", label: "Settings", icon: Settings },
    ...(isAdmin ? [{ id: "admin", path: "/admin", label: "Admin", icon: Shield }] : []),
  ].filter(link => {
    //@ts-ignore - dynamic key check
    if (link.id && link.id in (settings.bottomNavTabs || {})) {
      //@ts-ignore
      return settings.bottomNavTabs[link.id];
    }
    return true;
  });

  return (
    <div className="fixed bottom-4 left-0 w-full flex justify-center z-50 px-3 pointer-events-none md:hidden transition-all duration-300">
      <nav className="bg-white/92 dark:bg-slate-950/92 backdrop-blur-2xl border border-white/50 dark:border-slate-800 rounded-[2rem] px-2 py-2 shadow-xl shadow-slate-900/10 pointer-events-auto grid items-end gap-1 w-full max-w-md transition-colors" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          const Icon = link.icon;

          if (link.path === "/add") {
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className="relative -top-5 mx-1 flex justify-center"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30 border-4 border-slate-50 dark:border-slate-950"
                >
                  <Icon size={24} />
                </motion.div>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={link.path}
              to={link.path}
              className="relative px-1 py-2 rounded-2xl flex flex-col items-center justify-center min-w-0 h-full"
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-pill"
                  className="absolute inset-0 bg-blue-50 dark:bg-blue-500/15 rounded-2xl border border-blue-100/70 dark:border-blue-500/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span
                className={cn(
                  "relative z-10 mb-0.5 filter drop-shadow-sm transition-colors",
                  isActive ? "text-blue-600" : "text-slate-500 dark:text-slate-400"
                )}
              >
                <Icon size={18} />
              </span>
              {isActive && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative z-10 text-[9px] font-bold text-blue-600 leading-none"
                >
                  {link.label}
                </motion.span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
