import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Wallet, BarChart3, Shield, Plus, Settings, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import useOnline from "../hooks/useOnline";
import { useGamification } from "../hooks/useGamification";
import Avatar from "./Avatar";
import { cn } from "../lib/utils";
import { useUserRole } from "../hooks/useUserRole";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline } = useOnline();
  const { stats } = useGamification();
  const { isAdmin } = useUserRole();

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

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const desktopLinks = [
    { path: "/dashboard", label: "Home", icon: Home },
    { path: "/expenses", label: "Expenses", icon: Wallet },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
    ...(isAdmin ? [{ path: "/admin", label: "Admin", icon: Shield, id: "nav-admin-link" as const }] : []),
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed top-0 left-0 w-full z-50 px-4 sm:px-6 py-3 flex items-center justify-between bg-card/95 backdrop-blur-md border-b border-border shadow-card"
    >
      <div className="flex-1 flex items-center gap-3">
        <div
          className={cn(
            "flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium cursor-help",
            isOnline ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}
          title={isOnline ? "Connected" : "Offline — changes will sync when back online"}
        >
          <span className="relative flex h-1.5 w-1.5 rounded-full bg-current" />
          {isOnline ? "Online" : "Offline"}
        </div>
      </div>

      <div className="flex-1 flex justify-center">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="text-lg font-semibold text-foreground tracking-tight"
        >
          Expense Tracker
        </button>
      </div>

      <nav className="hidden md:flex items-center gap-1 bg-muted/80 p-1 rounded-lg border border-border">
        {desktopLinks.map((link) => {
          const isActive = location.pathname === link.path;
          const Icon = link.icon;
          return (
            <button
              key={link.path}
              id={link.id}
              type="button"
              onClick={() => navigate(link.path)}
              className={cn(
                "relative px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                isActive ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={16} />
              {link.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 flex justify-end items-center gap-2 relative">
        <button
          type="button"
          onClick={() => navigate("/add")}
          className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-primary text-primary-foreground rounded-xl font-medium text-sm shadow-glow hover:shadow-glow-lg transition-all hover:opacity-95"
        >
          <Plus size={18} />
          Add
        </button>
        {stats.currentStreak > 0 && (
          <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground" title="Login streak">
            <span>{stats.currentStreak}</span>
          </span>
        )}
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="rounded-full p-0.5 border border-border bg-card hover:shadow-card-hover transition-shadow"
        >
          <Avatar
            src={user?.photoURL}
            name={user?.displayName || "User"}
            size={36}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              ref={popupRef}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-12 w-56 py-2 bg-card border border-border rounded-xl shadow-card-hover z-[60]"
            >
              <div className="px-4 py-2 mb-2 flex items-center gap-3">
                <Avatar src={user?.photoURL} name={user?.displayName || "User"} size={40} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground truncate text-sm">
                    {user?.displayName || "Guest"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                </div>
              </div>
              <div className="h-px bg-border mx-2 mb-2" />
              <button
                type="button"
                onClick={() => { navigate("/settings"); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Settings size={18} className="text-muted-foreground" />
                Settings
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await logout();
                    navigate("/");
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut size={18} />
                Sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
