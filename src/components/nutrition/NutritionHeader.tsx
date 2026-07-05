import { Link, useLocation } from "react-router-dom";
import { Settings, LogOut, ArrowLeftRight, Activity, Apple, ActivitySquare, User, PieChart } from "lucide-react";
import { cn } from "../../lib/utils";
import Avatar from "../Avatar";
import { useAuth } from "../../hooks/useAuth";

export default function NutritionHeader() {
  const { user, logout } = useAuth();

  const handleSwitchApp = () => {
    localStorage.removeItem('selectedApp');
    window.location.reload();
  };

  const location = useLocation();

  const navItems = [
    { id: "dashboard", path: "/", icon: Activity, label: "Home" },
    { id: "analytics", path: "/analytics", icon: PieChart, label: "Analytics" },
    { id: "body", path: "/body", icon: ActivitySquare, label: "Body" },
    { id: "profile", path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="fixed top-0 left-0 w-full z-50 pointer-events-none">
      <div className="w-full px-4 pt-4 sm:px-6 sm:pt-6 pointer-events-auto">
        <header className="relative flex items-center justify-between h-16 px-4 rounded-3xl bg-card/80 backdrop-blur-xl border border-border shadow-lg">
          <div className="flex items-center gap-3">
            <Avatar src={user?.photoURL} name={user?.displayName} size={32} />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">
                {user?.displayName || "Nutrition"}
              </span>
              <span className="text-[10px] text-emerald-500 font-medium tracking-wider uppercase">
                Tracker
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center justify-center gap-6 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => {
              const isActive = location.pathname.includes(item.path) || (item.path === "/" && location.pathname === "/dashboard");
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300",
                    isActive 
                      ? "bg-emerald-500/10 text-emerald-500" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon size={18} className={isActive ? "stroke-[2.5px]" : ""} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSwitchApp}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Switch App"
            >
              <ArrowLeftRight size={20} />
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
      </div>
    </div>
  );
}
