import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Calendar,
  Home,
  Plus,
  Settings,
  Shield,
  Wallet,
  Users,
  EyeOff
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import useOnline from "../hooks/useOnline";
import { useGamification } from "../hooks/useGamification";
import { useUserRole } from "../hooks/useUserRole";
import { useModals } from "../hooks/useModals";
import { useVaults } from "../hooks/useVaults";
import Avatar from "./Avatar";
import { useExpenses } from "../hooks/useExpenses";
import { useStoryGenerator } from "../hooks/useStoryGenerator";
import useSettings from "../hooks/useSettings";
import StoryViewer from "./story/StoryViewer";
import { cn } from "../lib/utils";
import { currentMonthKey, todayDateKey } from "../utils/dates";

function formatMonthLabel(month: string, short = false) {
  if (!month) return "This Month";

  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: short ? "short" : "long",
    year: short ? undefined : "numeric",
  });
}

export default function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isOnline } = useOnline();
  const { stats } = useGamification();
  const { isAdmin } = useUserRole();
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
  const selectedMonth = globalMonth ?? months[0] ?? currentMonthKey(settings.timezone);
  const filteredExpenses = useMemo(
    () => expenses.filter((expense) => expense.month === selectedMonth),
    [expenses, selectedMonth]
  );
  const storySlides = useStoryGenerator(filteredExpenses, selectedMonth, expenses);

  const [showStory, setShowStory] = useState(false);

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
              onClick={() => setShowStory(true)}
              className="focus:outline-none"
              aria-label="Open your monthly story"
              title="Monthly story"
            >
              <span
                className={cn(
                  "relative grid place-items-center rounded-full p-[2px]",
                  storySlides.length > 0
                    ? "bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-400"
                    : "bg-border opacity-70"
                )}
              >
                <span className="rounded-full bg-card p-[2px]">
                  <Avatar src={user?.photoURL} name={user?.displayName || "User"} size={36} />
                </span>
              </span>
            </button>
          </div>
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
