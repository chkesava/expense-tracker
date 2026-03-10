import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import { motion } from "framer-motion";
import { useUserRole } from "../hooks/useUserRole";
import { BarChart3, Home, Plus, Settings, Shield, Wallet } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();



  const { isAdmin } = useUserRole();

  const links = [
    { path: "/dashboard", label: "Home", icon: Home },
    { path: "/expenses", label: "Expenses", icon: Wallet },
    { path: "/add", label: "Add", icon: Plus },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
    { path: "/settings", label: "Settings", icon: Settings },
    ...(isAdmin ? [{ path: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  return (
    <div className="fixed bottom-6 left-0 w-full flex justify-center z-50 px-4 pointer-events-none md:hidden transition-all duration-300">
      <nav className="bg-white/90 backdrop-blur-2xl border border-white/40 rounded-full px-2 py-2 shadow-xl shadow-indigo-500/20 pointer-events-auto flex items-center justify-between gap-1 max-w-sm w-full">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          const Icon = link.icon;

          if (link.path === "/add") {
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className="relative -top-6 mx-1"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl shadow-lg shadow-blue-500/40 border-4 border-slate-50"
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
              className="relative px-3 py-2 rounded-full flex flex-col items-center justify-center min-w-[3.5rem] h-full"
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-pill"
                  className="absolute inset-0 bg-blue-50 rounded-full border border-blue-100/50"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span
                className={cn(
                  "relative z-10 mb-0.5 filter drop-shadow-sm transition-colors",
                  isActive ? "text-blue-600" : "text-slate-500"
                )}
              >
                <Icon size={18} />
              </span>
              {isActive && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative z-10 text-[9px] font-bold text-blue-600"
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
