import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Settings } from "lucide-react";
import { cn } from "../../lib/utils";

export default function AdminBottomNav() {
    const location = useLocation();

    const navigation = [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { name: "Users", href: "/admin/users", icon: Users },
        { name: "Settings", href: "/admin/settings", icon: Settings },
    ];

    const isActive = (path: string) => {
        if (path === "/admin") {
            return location.pathname === "/admin";
        }
        return location.pathname.startsWith(path);
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 lg:hidden pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
            <nav className="flex items-center justify-around px-2 h-[68px]">
                {navigation.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 relative transition-all duration-300",
                                active ? "text-blue-600 dark:text-blue-500" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                            )}
                        >
                            {active && (
                                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-600 dark:bg-blue-500 rounded-b-full shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                            )}
                            <div className={cn(
                                "p-1.5 rounded-xl transition-all duration-300",
                                active ? "bg-blue-50 dark:bg-blue-900/20" : "bg-transparent"
                            )}>
                                <Icon className={cn("h-[22px] w-[22px]", active && "transform scale-110")} />
                            </div>
                            <span className={cn(
                                "text-[10px] font-bold tracking-wider transition-all duration-300",
                                active ? "transform -translate-y-0.5" : ""
                            )}>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
