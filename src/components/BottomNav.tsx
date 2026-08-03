import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import { motion } from "framer-motion";
import { useModals } from "../hooks/useModals";
import { BarChart3, Home, Wallet, Users, TrendingUp } from "lucide-react";
import { CORE_NAV_ITEMS, isNavItemActive } from "../config/navigation";
import useSettings from "../hooks/useSettings";
import AddFab from "./ui/AddFab";
import { ICON_SIZE, ICON_STROKE } from "../lib/iconSizes";

export default function BottomNav() {
  const location = useLocation();
  const { setIsAddExpenseOpen } = useModals();
  const { settings } = useSettings();

  const iconById = {
    home: Home,
    ledger: Wallet,
    investments: TrendingUp,
    vaults: Users,
    insights: BarChart3,
  } as const;

  const navLinks = CORE_NAV_ITEMS.filter(
    (item) => item.includeInBottomNav && (!item.requiresInvestmentsFeature || settings.enableInvestments)
  );

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
          "relative flex min-w-0 flex-1 flex-col items-center justify-center px-1 py-2 transition-colors duration-200",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
        aria-label={`Go to ${link.label}`}
      >
        {isActive && (
          <motion.div
            layoutId="bottom-nav-active-bg"
            className="absolute inset-0 -z-10 rounded-2xl bg-primary/10"
            initial={false}
            transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
          />
        )}
        <Icon
          size={ICON_SIZE.md}
          strokeWidth={isActive ? 2.25 : ICON_STROKE}
          className={cn("transition-transform duration-200", isActive && "scale-105")}
        />
        <span
          className={cn(
            "mt-1 text-[11px] font-semibold tracking-wide transition-opacity duration-200",
            isActive ? "opacity-100" : "opacity-70"
          )}
        >
          {link.label}
        </span>
        {isActive && (
          <motion.div
            layoutId="bottom-nav-indicator"
            className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary"
            transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
          />
        )}
      </NavLink>
    );
  };

  return (
    <div className="mobile-action-dock pointer-events-none fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-0 z-[100] flex w-full justify-center px-3 sm:px-4 md:hidden">
      <nav className="bento-card pointer-events-auto flex w-full max-w-[480px] items-center justify-between gap-1 px-3 py-2">
        {leftLinks.map(renderLink)}

        <div className="relative flex min-w-0 flex-1 flex-col items-center justify-center p-1">
          <AddFab
            size="md"
            onClick={() => setIsAddExpenseOpen(true)}
            aria-label="Add transaction"
          />
        </div>

        {rightLinks.map(renderLink)}
      </nav>
    </div>
  );
}
