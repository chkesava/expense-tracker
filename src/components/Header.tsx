import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import useOnline from "../hooks/useOnline";
import { useGamification } from "../hooks/useGamification";
import Avatar from "./Avatar";
import { cn } from "../lib/utils";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline } = useOnline();
  const { stats } = useGamification();

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
        "fixed top-0 left-0 w-full z-50 px-6 py-3 flex items-center justify-between",
        "bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm transition-all duration-300"
      )}
    >
      {/* LEFT – Status */}
      {/* LEFT – Status & Logo */}
      <div className="flex-1 flex items-center gap-3">
        <div
          className={cn(
            "flex items-center gap-2 px-2.5 py-1 rounded-full text-[13px] font-medium transition-all duration-300 cursor-help",
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
          className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent cursor-pointer tracking-tight"
        >
          ExpenseTracker
        </motion.button>
      </div>

      {/* CENTER - Desktop Nav */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-full border border-slate-200/60 backdrop-blur-md">
        {[
          { path: "/dashboard", label: "Home", icon: "🏠" },
          { path: "/expenses", label: "Expenses", icon: "💸" },
          { path: "/analytics", label: "Analytics", icon: "📊" },
        ].map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <motion.button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={cn(
                "relative px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 flex items-center gap-2",
                isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="header-nav-pill"
                  className="absolute inset-0 bg-white shadow-sm rounded-full border border-slate-100"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{link.icon}</span>
              <span className="relative z-10">{link.label}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* RIGHT – Profile & Actions */}
      <div className="flex-1 flex justify-end items-center gap-3 relative">
        {/* Desktop Add Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/add")}
          className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full font-bold text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-shadow"
        >
          <span>＋</span>
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
          className="rounded-full p-0.5 border-2 border-white/80 shadow-sm bg-white hover:shadow-md transition-shadow"
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
              className="absolute right-0 top-14 w-64 p-2 bg-white/80 backdrop-blur-2xl border border-white/60 rounded-2xl shadow-xl overflow-hidden z-[60]"
            >
              <div className="p-3 mb-2 flex items-center gap-3">
                <Avatar
                  src={user?.photoURL}
                  name={user?.displayName || "User"}
                  size={48}
                  className="shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 truncate text-[15px]">
                    {user?.displayName || "Guest User"}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {user?.email}
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-200/50 mx-2 mb-2" />

              <div className="space-y-1">
                <button
                  onClick={() => navigate("/settings")}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100/80 hover:text-blue-600 transition-colors"
                >
                  <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    ⚙️
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
                    🚪
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