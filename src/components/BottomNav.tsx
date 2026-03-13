import { NavLink, useLocation } from "react-router-dom";
import { Home, Wallet, Plus, BarChart3, Settings, Shield } from "lucide-react";
import { cn } from "../lib/utils";
import { useUserRole } from "../hooks/useUserRole";

const navLinks = [
  { path: "/dashboard", label: "Home", icon: Home },
  { path: "/expenses", label: "Expenses", icon: Wallet },
  { path: "/add", label: "Add", icon: Plus },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const location = useLocation();
  const { isAdmin } = useUserRole();

  const links: { path: string; label: string; icon: typeof Home; id?: string }[] = [
  ...navLinks,
  ...(isAdmin ? [{ path: "/admin", label: "Admin", icon: Shield, id: "mobile-nav-admin-link" }] : []),
];

  return (
    <div className="fixed bottom-0 left-0 w-full flex justify-center z-50 px-4 pb-6 pt-2 md:hidden bg-card/90 backdrop-blur-xl border-t border-border shadow-[0_-4px_20px_-5px_rgb(0_0_0_/0.06)]">
      <nav className="flex items-center justify-center gap-1 w-full max-w-md bg-muted/50 rounded-xl py-2 px-2 border border-border">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          const Icon = link.icon;

          if (link.path === "/add") {
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className="flex flex-col items-center justify-center min-w-[56px] -mt-6"
              >
                <span className="w-12 h-12 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow-lg">
                  <Icon size={22} />
                </span>
                <span className="text-[10px] font-medium text-muted-foreground mt-1">Add</span>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={link.path}
              {...(link.id ? { id: link.id } : {})}
              to={link.path}
              className={cn(
                "flex flex-col items-center justify-center min-w-[52px] py-1.5 rounded-lg transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium mt-0.5">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
