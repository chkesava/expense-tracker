import { cn } from "../../lib/utils";
import { motion } from "framer-motion";

type BadgeVariant = "primary" | "secondary" | "success" | "warning" | "danger" | "ghost" | "neon" | "gold";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  isRibbon?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  primary: "bg-blue-500 text-white shadow-blue-500/20",
  secondary: "bg-slate-500 text-white shadow-slate-500/20",
  success: "bg-emerald-500 text-white shadow-emerald-500/20",
  warning: "bg-amber-500 text-white shadow-amber-500/20",
  danger: "bg-rose-500 text-white shadow-rose-500/20",
  ghost: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
  neon: "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-pink-500/40 animate-pulse",
  gold: "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-500/30",
};

export function Badge({ children, variant = "primary", className, isRibbon = false }: BadgeProps) {
  return (
    <motion.div
      initial={isRibbon ? { opacity: 0, scale: 0.8 } : false}
      animate={isRibbon ? { opacity: 1, scale: 1 } : false}
      className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm",
        isRibbon && "absolute top-0 right-4 rounded-t-none rounded-b-xl z-10",
        variants[variant],
        className
      )}
    >
      {children}
    </motion.div>
  );
}
