import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BarChart3,
  Calendar,
  Home,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Wallet,
  Users,
  Search,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import useOnline from "../hooks/useOnline";
import { useGamification } from "../hooks/useGamification";
import { useTheme } from "../hooks/useTheme";
import { useUserRole } from "../hooks/useUserRole";
import { useModals } from "../hooks/useModals";
import { useExpenses } from "../hooks/useExpenses";
import { useStoryGenerator } from "../hooks/useStoryGenerator";
import Avatar from "./Avatar";
import StoryViewer from "./story/StoryViewer";
import { cn } from "../lib/utils";

function formatMonthLabel(month: string, short = false) {
  if (!month) return "This Month";

  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: short ? "short" : "long",
    year: short ? undefined : "numeric",
  });
}

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline } = useOnline();
  const { stats } = useGamification();
  const { isAdmin } = useUserRole();
  const { theme } = useTheme();
  const { setIsMonthDrawerOpen, setIsAddExpenseOpen, globalMonth } = useModals();
  const { expenses } = useExpenses();

  const desktopLinks = [
    { path: "/dashboard", label: "Home", icon: Home },
    { path: "/expenses", label: "Expenses", icon: Wallet },
    { path: "/split", label: "Split", icon: Users },
    { path: "/subscriptions", label: "Subs", icon: RefreshCw },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
    { path: "/analysis", label: "Analysis", icon: Search },
    ...(isAdmin ? [{ path: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  const months = useMemo(
    () => Array.from(new Set(expenses.map((expense) => expense.month))).sort().reverse(),
    [expenses]
  );
  const selectedMonth = globalMonth ?? months[0] ?? new Date().toISOString().slice(0, 7);
  const filteredExpenses = useMemo(
    () => expenses.filter((expense) => expense.month === selectedMonth),
    [expenses, selectedMonth]
  );
  const storySlides = useStoryGenerator(filteredExpenses, selectedMonth, expenses);

  const [showStory, setShowStory] = useState(false);
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!popupRef.current || !btnRef.current) return;
      const target = event.target as Node;
      if (!popupRef.current.contains(target) && !btnRef.current.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <>
      <StoryViewer isOpen={showStory} onClose={() => setShowStory(false)} slides={storySlides} />

      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed top-0 left-0 w-full z-50 px-4 md:px-8 py-3 flex items-center justify-between gap-4",
          "bg-white/70 dark:bg-slate-950/40 backdrop-blur-3xl border-b border-slate-100 dark:border-white/5 shadow-[0_2px_15px_rgb(0,0,0,0.02)] transition-all duration-300"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl shadow-slate-900/10">
              <Activity size={18} />
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">
              Antigravity
            </span>
          </motion.button>

          <div
            className={cn(
              "hidden min-[360px]:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] shadow-sm ring-1 transition-all duration-300",
              isOnline
                ? "bg-emerald-500/10 text-emerald-600 ring-emerald-200/70 dark:ring-emerald-500/20"
                : "bg-red-500/10 text-red-600 ring-red-200/70 dark:ring-red-500/20"
            )}
            title={isOnline ? "Connected to database" : "Working offline - changes will sync later"}
          >
            <span className="relative flex h-2 w-2">
              {isOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  isOnline ? "bg-emerald-500" : "bg-red-500"
                )}
              />
            </span>
            <span>{isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1 bg-slate-50 dark:bg-white/5 p-1 rounded-xl border border-slate-100 dark:border-white/5">
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
                    className="absolute inset-0 bg-white dark:bg-white/10 shadow-sm rounded-lg border border-slate-100 dark:border-white/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon size={15} className="relative z-10" />
                <span className="relative z-10">{link.label}</span>
              </motion.button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-2 relative">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsMonthDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-slate-600 dark:text-slate-200 shadow-sm hover:shadow-md transition-all"
            aria-label="Choose month"
          >
            <Calendar size={12} />
            <span className="text-[11px] font-black tracking-[0.08em] hidden sm:inline">{formatMonthLabel(selectedMonth, true)}</span>
            <span className="text-[10px] font-black tracking-[0.08em] sm:hidden">{formatMonthLabel(selectedMonth, true)}</span>
          </motion.button>


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
            <div
              className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-100/50 dark:border-orange-500/20 rounded-full text-xs font-bold text-orange-600 dark:text-orange-400 shadow-sm"
              title="Current Login Streak"
            >
              <span className="text-sm">🔥</span>
              <span>{stats.currentStreak}</span>
            </div>
          )}

          <motion.button
            ref={btnRef}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen((value) => !value)}
            className="hidden md:inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-2 text-slate-600 dark:text-slate-200 shadow-sm hover:shadow-md transition-all"
            aria-label="Open account menu"
          >
            <Settings size={18} />
          </motion.button>

          <motion.button
            whileHover={{ scale: storySlides.length ? 1.05 : 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => storySlides.length > 0 && setShowStory(true)}
            className={cn(
              "relative rounded-full p-[3px] transition-all shrink-0",
              storySlides.length
                ? "bg-[conic-gradient(from_180deg_at_50%_50%,#06b6d4_0deg,#3b82f6_120deg,#14b8a6_240deg,#06b6d4_360deg)] shadow-[0_0_0_3px_rgba(14,165,233,0.12)]"
                : "bg-slate-200 dark:bg-slate-700"
            )}
            aria-label={storySlides.length ? "Open monthly status" : "Monthly status unavailable"}
            disabled={storySlides.length === 0}
          >
            <div className="rounded-full bg-white dark:bg-slate-950 p-0.5">
              <Avatar src={user?.photoURL} name={user?.displayName || "User"} size={36} />
            </div>
          </motion.button>

          <AnimatePresence>
            {open && (
              <motion.div
                ref={popupRef}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-12 top-14 w-64 p-2 bg-white/80 dark:bg-slate-950/90 backdrop-blur-2xl border border-white/60 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-[60]"
              >
                <div className="p-3 mb-2 flex items-center gap-3">
                  <Avatar src={user?.photoURL} name={user?.displayName || "User"} size={48} className="shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-100 truncate text-[15px]">
                      {user?.displayName || "Guest User"}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</div>
                  </div>
                </div>

                <div className="h-px bg-slate-200/50 dark:bg-slate-800 mx-2 mb-2" />

                <div className="space-y-1">

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
                        navigate("/");
                      } catch (error) {
                        console.error(error);
                      }
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
    </>
  );
}
