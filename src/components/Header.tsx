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
  Eye,
  EyeOff
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import useOnline from "../hooks/useOnline";
import { useGamification } from "../hooks/useGamification";
import { useTheme } from "../hooks/useTheme";
import { useUserRole } from "../hooks/useUserRole";
import { useModals } from "../hooks/useModals";
import { useVaults } from "../hooks/useVaults";
import Avatar from "./Avatar";
import { useExpenses } from "../hooks/useExpenses";
import { useStoryGenerator } from "../hooks/useStoryGenerator";
import useSettings from "../hooks/useSettings";
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
  const { settings, setGhostMode } = useSettings();

  const desktopLinks = [
    { path: "/dashboard", label: "Home", icon: Home },
    { path: "/ledger", label: "Ledger", icon: Wallet },
    { path: "/vaults", label: "Vaults", icon: Users },
    { path: "/insights", label: "Insights", icon: BarChart3 },
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
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed top-2 left-2 right-2 sm:top-5 sm:left-5 sm:right-5 max-w-7xl mx-auto z-50 px-2.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4",
          "bento-card transition-all duration-500"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background shadow-xl shadow-foreground/10">
              <Activity size={18} />
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-tighter text-gradient-premium">
              Vault
            </span>
          </motion.button>

          <div
            onClick={() => setGhostMode(!settings.ghostMode)}
            className={cn(
              "hidden min-[360px]:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] shadow-sm ring-1 transition-all duration-300 cursor-pointer hover:bg-muted/50",
              settings.ghostMode
                ? "bg-primary/10 text-primary ring-primary/40"
                : isOnline
                  ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20"
                  : "bg-red-500/10 text-red-600 ring-red-500/20"
            )}
            title={settings.ghostMode ? "Ghost Mode Active - Amounts blurred" : isOnline ? "Connected to database" : "Working offline"}
          >
            {settings.ghostMode ? (
              <EyeOff size={10} className="animate-pulse" />
            ) : (
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
            )}
             <span className="hidden sm:inline">{settings.ghostMode ? "Ghost" : isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-md p-1.5 rounded-[1.5rem] border border-white/50 dark:border-white/5">
          {desktopLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            return (
              <motion.button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={cn(
                  "relative px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 flex items-center gap-2",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="header-nav-pill"
                    className="absolute inset-0 bg-background shadow-sm rounded-2xl border border-border"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon size={15} className="relative z-10" />
                <span className="relative z-10">{link.label}</span>
              </motion.button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2 relative">
          <VaultMemberIndicator />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsMonthDrawerOpen(true)}
            className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-border bg-card/90 px-2 py-1.5 sm:px-3 sm:py-1.5 text-foreground shadow-sm hover:shadow-md transition-all"
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
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/settings")}
            className="flex items-center justify-center rounded-xl border border-border bg-card p-2 text-foreground shadow-sm hover:shadow-md transition-all"
            aria-label="Open settings"
          >
            <Settings size={18} />
          </motion.button>

          <div className="relative shrink-0">
            <button
              ref={btnRef}
              onClick={() => setOpen((v) => !v)}
              className="focus:outline-none"
            >
              <Avatar src={user?.photoURL} name={user?.displayName || "User"} size={36} />
            </button>
          </div>

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
function VaultMemberIndicator() {
  const location = useLocation();
  const { vaults } = useVaults();
  
  const vaultId = location.pathname.match(/\/vaults\/([^/]+)/)?.[1];
  const vault = vaults.find(v => v.id === vaultId);
  
  if (!vault) return null;
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700"
    >
      <div className="flex -space-x-2">
        {vault.memberIds.slice(0, 3).map((id, i) => (
          <Avatar key={id} size={20} name={`M ${i}`} className="border-2 border-white dark:border-slate-800" />
        ))}
        {vault.memberIds.length > 3 && (
          <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-bold border-2 border-white dark:border-slate-800">
            +{vault.memberIds.length - 3}
          </div>
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-[8px] font-black uppercase tracking-tighter text-blue-600 dark:text-blue-400">Joint Access</span>
        <span className="text-[7px] font-bold text-slate-400 truncate max-w-[60px]">{vault.name}</span>
      </div>
    </motion.div>
  );
}
