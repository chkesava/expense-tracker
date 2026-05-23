import { motion, AnimatePresence } from "framer-motion";
import { X, Home, Wallet, Users, BarChart3, Settings, Shield, LogOut, Activity } from "lucide-react";
import { useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useAuth } from "../hooks/useAuth";
import { useUserRole } from "../hooks/useUserRole";
import { cn } from "../lib/utils";
import { ADMIN_NAV_ITEM, CORE_NAV_ITEMS, isNavItemActive } from "../config/navigation";

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SideDrawer({ isOpen, onClose }: SideDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(isOpen, panelRef);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { isAdmin } = useUserRole();

  const links = [
    ...CORE_NAV_ITEMS.filter((item) => item.includeInDrawer),
    ...(isAdmin ? [ADMIN_NAV_ITEM] : []),
  ];
  const iconById = {
    home: Home,
    ledger: Wallet,
    vaults: Users,
    insights: BarChart3,
    settings: Settings,
    admin: Shield,
  } as const;

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
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 bottom-0 w-[80%] max-w-sm bg-card shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Header */}
            <div className="p-8 pb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg shadow-foreground/20">
                  <Activity size={18} />
                </div>
                <h2 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">Vault</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl transition-all active:scale-90"
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Links */}
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
              {links.map((link) => {
                const isActive = isNavItemActive(location.pathname, link.id);
                const Icon = iconById[link.id];
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
                  onClick={async () => {
                    await logout();
                    onClose();
                    navigate('/');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-[2rem] bg-red-50 dark:bg-red-500/10 text-red-500 font-extrabold text-sm hover:bg-red-100 transition-colors"
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
