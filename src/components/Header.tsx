import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Calendar,
  Home,
  Settings,
  Shield,
  Wallet,
  Users,
  EyeOff,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import useOnline from "../hooks/useOnline";
import { useGamification } from "../hooks/useGamification";
import { useUserRole } from "../hooks/useUserRole";
import { useModals } from "../hooks/useModals";
import { useVaults } from "../hooks/useVaults";
import Avatar from "./Avatar";
import { useStoryGenerator } from "../hooks/useStoryGenerator";
import useSettings from "../hooks/useSettings";
import StoryViewer from "./story/StoryViewer";
import { cn } from "../lib/utils";
import { currentMonthKey } from "../utils/dates";
import { ADMIN_NAV_ITEM, CORE_NAV_ITEMS, isNavItemActive } from "../config/navigation";
import { useExpenses } from "../hooks/useExpenses";
import AnnouncementBanner from "./AnnouncementBanner";
import NotificationBell from "../features/sip/components/NotificationBell";
import AddFab from "./ui/AddFab";
import { ICON_SIZE, ICON_STROKE } from "../lib/iconSizes";

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
  const location = useLocation();
  const { isOnline } = useOnline();
  const { stats } = useGamification();
  const { isAdmin } = useUserRole();
  const { setIsMonthDrawerOpen, setIsAddExpenseOpen, globalMonth } = useModals();
  const { settings, setGhostMode } = useSettings();
  const { pendingSyncCount } = useExpenses();

  const desktopLinks = [
    ...CORE_NAV_ITEMS.filter(
      (item) => item.id !== "settings" && (!item.requiresInvestmentsFeature || settings.enableInvestments)
    ),
    ...(isAdmin ? [ADMIN_NAV_ITEM] : []),
  ];
  const iconById = {
    home: Home,
    ledger: Wallet,
    investments: TrendingUp,
    vaults: Users,
    insights: BarChart3,
    admin: Shield,
    settings: Settings,
  } as const;

  const selectedMonth = globalMonth ?? currentMonthKey(settings.timezone);

  const [showStory, setShowStory] = useState(false);

  const isAdminRoute = location.pathname.startsWith("/admin");

  if (isAdminRoute) {
    return (
      <div className="pointer-events-none fixed top-0 left-0 z-50 flex w-full flex-col">
        <div className="pointer-events-auto w-full">
          <AnnouncementBanner />
        </div>
      </div>
    );
  }

  return (
    <>
      {showStory && (
        <MonthlyStoryViewer
          isOpen={showStory}
          onClose={() => setShowStory(false)}
          selectedMonth={selectedMonth}
        />
      )}

      <div className="pointer-events-none fixed top-0 left-0 z-50 flex w-full flex-col">
        <div className="pointer-events-auto w-full">
          <AnnouncementBanner />
        </div>
        <div className="pointer-events-none w-full px-2 pt-2 sm:px-5 sm:pt-5">
          <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "pointer-events-auto mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-2.5 py-2.5 sm:gap-4 sm:px-4 sm:py-3",
              "bento-card"
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center gap-2.5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background">
                  <Activity size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Vault
                </span>
              </motion.button>

              <button
                type="button"
                onClick={() => setGhostMode(!settings.ghostMode)}
                className={cn(
                  "hidden min-[360px]:inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 transition-colors hover:bg-muted/50",
                  settings.ghostMode
                    ? "bg-primary/10 text-primary ring-primary/40"
                    : isOnline
                      ? "bg-success/10 text-success ring-success/20"
                      : "bg-destructive/10 text-destructive ring-destructive/20"
                )}
                title={
                  settings.ghostMode
                    ? "Ghost Mode Active - Amounts blurred"
                    : isOnline
                      ? "Connected to database"
                      : "Working offline"
                }
                aria-pressed={settings.ghostMode}
                aria-label={settings.ghostMode ? "Disable ghost mode" : "Enable ghost mode"}
              >
                {settings.ghostMode ? (
                  <EyeOff size={10} className="animate-pulse" />
                ) : (
                  <span className="relative flex h-2 w-2">
                    {isOnline && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                    )}
                    <span
                      className={cn(
                        "relative inline-flex h-2 w-2 rounded-full",
                        isOnline ? "bg-success" : "bg-destructive"
                      )}
                    />
                  </span>
                )}
                <span className="hidden sm:inline">
                  {settings.ghostMode ? "Ghost" : isOnline ? "Online" : "Offline"}
                </span>
              </button>

              {pendingSyncCount > 0 && (
                <div
                  className="inline-flex items-center gap-1.5 rounded-full bg-info/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-info ring-1 ring-info/20"
                  title={`${pendingSyncCount} changes syncing to cloud...`}
                >
                  <RefreshCw size={10} className="animate-spin" />
                  <span>{pendingSyncCount} syncing</span>
                </div>
              )}
            </div>

            <nav className="hidden items-center gap-1 rounded-2xl border border-border bg-muted/50 p-1.5 lg:flex">
              {desktopLinks.map((link) => {
                const isActive = isNavItemActive(location.pathname, link.id);
                const Icon = iconById[link.id];
                return (
                  <motion.button
                    key={link.path}
                    type="button"
                    onClick={() => navigate(link.path)}
                    className={cn(
                      "relative flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="header-nav-pill"
                        className="absolute inset-0 rounded-2xl border border-border bg-card shadow-sm"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <Icon size={ICON_SIZE.xs} strokeWidth={ICON_STROKE} className="relative z-10" />
                    <span className="relative z-10">{link.label}</span>
                  </motion.button>
                );
              })}
            </nav>

            <div className="relative flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
              <VaultMemberIndicator />
              {settings.enableInvestments && <NotificationBell />}
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsMonthDrawerOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1.5 text-foreground transition-colors hover:bg-muted/60 sm:gap-1.5 sm:px-3"
                aria-label="Choose month"
              >
                <Calendar size={ICON_SIZE.xs} strokeWidth={ICON_STROKE} />
                <span className="text-[11px] font-semibold tracking-wide sm:text-xs">
                  {formatMonthLabel(selectedMonth, true)}
                </span>
              </motion.button>

              <AddFab
                withLabel
                className="hidden md:inline-flex"
                onClick={() => setIsAddExpenseOpen(true)}
                aria-label="Add transaction"
              />

              {stats.currentStreak > 0 && (
                <div
                  className="hidden items-center gap-1.5 rounded-full border border-warning/20 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning md:flex"
                  title="Current Login Streak"
                >
                  <span className="text-sm" aria-hidden>
                    🔥
                  </span>
                  <span>{stats.currentStreak}</span>
                </div>
              )}

              {isAdmin && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate("/admin")}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-info/20 bg-info/10 px-3 py-2 text-info transition-colors hover:bg-info/15 lg:hidden"
                  aria-label="Open Admin Panel"
                >
                  <Shield size={ICON_SIZE.xs} strokeWidth={ICON_STROKE} />
                  <span className="text-[11px] font-semibold tracking-wide uppercase">Admin</span>
                </motion.button>
              )}

              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/settings")}
                className="flex items-center justify-center rounded-xl border border-border bg-card p-2 text-foreground transition-colors hover:bg-muted/60"
                aria-label="Open settings"
              >
                <Settings size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} />
              </motion.button>

              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowStory(true)}
                  className="rounded-full focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Open your monthly story"
                  title="Monthly story"
                >
                  <span className="relative grid place-items-center rounded-full bg-primary/20 p-[2px]">
                    <span className="rounded-full bg-card p-[2px]">
                      <Avatar src={user?.photoURL} name={user?.displayName || "User"} size={36} />
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </motion.header>
        </div>
      </div>
    </>
  );
}

function MonthlyStoryViewer({
  isOpen,
  onClose,
  selectedMonth,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string;
}) {
  const { expenses } = useExpenses();
  const filteredExpenses = useMemo(
    () => expenses.filter((expense) => expense.month === selectedMonth),
    [expenses, selectedMonth]
  );
  const storySlides = useStoryGenerator(filteredExpenses, selectedMonth, expenses);

  return <StoryViewer isOpen={isOpen} onClose={onClose} slides={storySlides} />;
}

function VaultMemberIndicator() {
  const location = useLocation();
  const { vaults } = useVaults();

  const vaultId = location.pathname.match(/\/vaults\/([^/]+)/)?.[1];
  const vault = vaults.find((v) => v.id === vaultId);

  if (!vault) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 sm:flex"
    >
      <div className="flex -space-x-2">
        {vault.memberIds.slice(0, 3).map((id, i) => (
          <Avatar key={id} size={20} name={`M ${i}`} className="border-2 border-card" />
        ))}
        {vault.memberIds.length > 3 && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-muted text-[8px] font-semibold text-muted-foreground">
            +{vault.memberIds.length - 3}
          </div>
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] font-semibold tracking-tight text-primary">Joint Access</span>
        <span className="max-w-[90px] truncate text-[11px] font-medium text-muted-foreground">
          {vault.name}
        </span>
      </div>
    </motion.div>
  );
}
