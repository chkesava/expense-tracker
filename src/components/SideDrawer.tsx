import { motion, AnimatePresence } from "framer-motion";
import { X, Home, Wallet, Users, RefreshCw, BarChart3, Settings, Shield, LogOut, Sun, Moon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useUserRole } from "../hooks/useUserRole";
import { cn } from "../lib/utils";
import { useTheme } from "../hooks/useTheme";

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SideDrawer({ isOpen, onClose }: SideDrawerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { isAdmin } = useUserRole();
  const { theme, toggleTheme } = useTheme();

  const links = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/expenses", label: "My Expenses", icon: Wallet },
    { path: "/split", label: "Split Bills", icon: Users },
    { path: "/subscriptions", label: "Recurring", icon: RefreshCw },
    { path: "/analytics", label: "Insights", icon: BarChart3 },
    { path: "/settings", label: "Preferences", icon: Settings },
    ...(isAdmin ? [{ path: "/admin", label: "Admin Panel", icon: Shield }] : []),
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] md:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 bottom-0 w-[80%] max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-8 pb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-black text-xl">
                  E
                </div>
                <h2 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">Navigation</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Links */}
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
              {links.map((link) => {
                const isActive = location.pathname === link.path;
                const Icon = link.icon;
                return (
                  <button
                    key={link.path}
                    onClick={() => {
                      navigate(link.path);
                      onClose();
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-3xl font-bold text-sm transition-all active:scale-[0.98]",
                      isActive 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <Icon size={20} />
                    {link.label}
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-8 border-t border-slate-50 dark:border-slate-800/50">
              <div className="flex items-center gap-4 mb-6">
                {user?.photoURL ? (
                  <img src={user.photoURL} className="w-12 h-12 rounded-2xl border-2 border-slate-100 dark:border-slate-800" alt="profile"/>
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                    {user?.displayName?.[0] || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-900 dark:text-white truncate">{user?.displayName || "User"}</p>
                  <p className="text-xs font-bold text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={toggleTheme}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-[2rem] bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-sm hover:bg-slate-100 transition-colors"
                >
                  {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                  {theme === "light" ? "Dark" : "Light"}
                </button>

                <button
                  onClick={async () => {
                    await logout();
                    onClose();
                    navigate('/');
                  }}
                  className="flex-[2] flex items-center justify-center gap-2 py-4 rounded-[2rem] bg-red-50 dark:bg-red-500/10 text-red-500 font-extrabold text-sm hover:bg-red-100 transition-colors"
                >
                  <LogOut size={18} /> Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
