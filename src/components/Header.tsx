import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BarChart3,
  Home,
  Calendar,
  LogOut,
  Moon,
  Plus,
  Settings,
  Shield,
  Sun,
  Wallet,
  Users,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import useOnline from "../hooks/useOnline";
import { useGamification } from "../hooks/useGamification";
import Avatar from "./Avatar";
import { cn } from "../lib/utils";
import { useTheme } from "../hooks/useTheme";

import { useUserRole } from "../hooks/useUserRole";
import { useModals } from "../hooks/useModals";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline } = useOnline();
  const { stats } = useGamification();
  const { isAdmin } = useUserRole();
  const { theme, toggleTheme } = useTheme();
  const { setIsMonthDrawerOpen, setIsAddExpenseOpen } = useModals();

  const desktopLinks = [
    { path: "/dashboard", label: "Home", icon: Home },
    { path: "/expenses", label: "Expenses", icon: Wallet },
    { path: "/split", label: "Split", icon: Users },
    { path: "/subscriptions", label: "Subs", icon: RefreshCw },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
    ...(isAdmin ? [{ path: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!popupRef.current || !btnRef.current) return;
      const target = e.target as Node;
      if (!popupRef.current.contains(target) && !btnRef.current.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed top-0 left-0 w-full z-50 px-4 sm:px-6 py-3 flex items-center justify-between",
        "bg-white/75 dark:bg-slate-950/75 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(15,23,42,0.06)] transition-all duration-300"
      )}
    >
      {/* LEFT – Status & Logo */}
      <div className="flex-1 flex items-center gap-3">
        <div
          className={cn(
            "flex items-center gap-2 px-2.5 py-1 rounded-full text-[12px] font-semibold tracking-wide transition-all duration-300 cursor-help",
            isOnline
              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
              : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
          )}
          title={isOnline ? "Connected to database" : "Working offline - changes will sync later"}
        >
          <span className="relative flex h-2 w-2">
            {isOnline && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
            )}
            <span
              className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                isOnline ? "bg-emerald-500" : "bg-red-500"
              )}
            />
          </span>
          <span className="tracking-wide">
            {isOnline ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* CENTER – Title */}
      <div className="flex-1 flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 text-lg sm:text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent cursor-pointer tracking-tight"
        >
          <span className="hidden sm:inline-flex w-7 h-7 rounded-lg bg-blue-600/10 items-center justify-center text-blue-600">
            <Activity size={16} />
          </span>
          ExpenseTracker
        </motion.button>
      </div>

      {/* CENTER - Desktop Nav */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 dark:bg-slate-900/70 p-1 rounded-full border border-slate-200/70 dark:border-slate-800 backdrop-blur-md">
        {desktopLinks.map((link) => {
          const isActive = location.pathname === link.path;
          const Icon = link.icon;
          return (
            <motion.button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={cn(
                "relative px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 flex items-center gap-2",
                isActive ? "text-blue-600" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-100"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="header-nav-pill"
                  className="absolute inset-0 bg-white dark:bg-slate-950 shadow-sm rounded-full border border-slate-100 dark:border-slate-800"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon size={15} className="relative z-10" />
              <span className="relative z-10">{link.label}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* RIGHT – Profile & Actions */}
      <div className="flex-1 flex justify-end items-center gap-3 relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="hidden md:inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 p-2.5 text-slate-600 dark:text-slate-200 shadow-sm hover:shadow-md transition-all"
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsMonthDrawerOpen(true)}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 p-2.5 text-slate-600 dark:text-slate-200 shadow-sm hover:shadow-md transition-all"
          aria-label="Filter by Month"
        >
          <Calendar size={16} />
        </motion.button>

        {/* Desktop Add Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAddExpenseOpen(true)}
          className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full font-bold text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-shadow"
        >
          <Plus size={16} />
          <span>Add</span>
        </motion.button>
        {stats.currentStreak > 0 && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100/50 rounded-full text-xs font-bold text-orange-600 shadow-sm" title="Current Login Streak">
            <span className="text-sm">🔥</span>
            <span>{stats.currentStreak}</span>
          </div>
        )}
        <motion.button
          ref={btnRef}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen((s) => !s)}
          className="hidden md:block rounded-full p-0.5 border-2 border-white/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 hover:shadow-md transition-shadow"
          aria-label="User menu"
        >
          <Avatar
            src={user?.photoURL}
            name={user?.displayName || "User"}
            size={38}
          />
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              ref={popupRef}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-14 w-64 p-2 bg-white/80 dark:bg-slate-950/90 backdrop-blur-2xl border border-white/60 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-[60]"
            >
              <div className="p-3 mb-2 flex items-center gap-3">
                <Avatar
                  src={user?.photoURL}
                  name={user?.displayName || "User"}
                  size={48}
                  className="shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 dark:text-slate-100 truncate text-[15px]">
                    {user?.displayName || "Guest User"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user?.email}
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-200/50 dark:bg-slate-800 mx-2 mb-2" />

              <div className="space-y-1">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-900 transition-colors"
                >
                  <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-300">
                    {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
                  </span>
                  {theme === "light" ? "Dark Mode" : "Light Mode"}
                </button>

                <button
                  onClick={() => navigate("/settings")}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-900 hover:text-blue-600 transition-colors"
                >
                  <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-300">
                    <Settings size={16} />
                  </span>
                  Settings
                </button>

                <button
                  onClick={async () => {
                    try {
                      await logout();
                      navigate('/');
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500">
                    <LogOut size={16} />
                  </span>
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
