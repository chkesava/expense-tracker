import { cn } from "../../lib/utils";
import { motion } from "framer-motion";

type BadgeVariant = "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "ghost" | "neon" | "gold";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  isRibbon?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-primary/20",
  secondary: "bg-secondary text-secondary-foreground shadow-black/5",
  success: "bg-success text-success-foreground shadow-success/20",
  warning: "bg-warning text-warning-foreground shadow-warning/20",
  danger: "bg-destructive text-destructive-foreground shadow-destructive/20",
  info: "bg-info text-info-foreground shadow-info/20",
  ghost: "bg-muted text-muted-foreground border border-border",
  neon: "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-pink-500/40 animate-pulse",
  gold: "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-500/30",
};

export function Badge({ children, variant = "primary", className, isRibbon = false }: BadgeProps) {
  return (
    <motion.div
      initial={isRibbon ? { opacity: 0, scale: 0.8 } : false}
      animate={isRibbon ? { opacity: 1, scale: 1 } : false}
      className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest rounded-lg shadow-sm",
        isRibbon && "absolute top-0 right-4 rounded-t-none rounded-b-xl z-10",
        variants[variant],
        className
      )}
    >
      {children}
    </motion.div>
  );
}
