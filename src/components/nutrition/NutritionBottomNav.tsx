import { Link, useLocation } from "react-router-dom";
import { Activity, Apple, ActivitySquare, Settings, User, PieChart } from "lucide-react";
import { cn } from "../../lib/utils";

export default function NutritionBottomNav() {
  const location = useLocation();

  const navItems = [
    { id: "dashboard", path: "/", icon: Activity, label: "Home" },
    { id: "analytics", path: "/analytics", icon: PieChart, label: "Analytics" },
    { id: "body", path: "/body", icon: ActivitySquare, label: "Body" },
    { id: "profile", path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 pointer-events-none flex justify-center">
      <nav className="relative flex items-center justify-around h-16 w-full rounded-[2rem] bg-card/80 backdrop-blur-xl border border-border shadow-2xl pointer-events-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname.includes(item.path) || (item.path === "/dashboard" && location.pathname === "/");
          return (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300",
                isActive ? "text-emerald-500 scale-110" : "text-muted-foreground hover:text-emerald-500/70"
              )}
            >
              <item.icon size={22} className={cn("transition-transform duration-300", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-emerald-500" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
