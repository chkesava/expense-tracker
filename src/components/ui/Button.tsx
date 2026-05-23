import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

export default function Button({
  className,
  children,
  variant = "primary",
  icon,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition-all active:scale-[0.98] disabled:opacity-50",
        variant === "primary" && "bg-primary text-primary-foreground",
        variant === "secondary" && "border border-border bg-card text-foreground",
        variant === "destructive" && "bg-destructive text-destructive-foreground",
        variant === "ghost" && "bg-transparent text-foreground hover:bg-muted/60",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
