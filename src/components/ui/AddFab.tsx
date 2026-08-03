import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { ICON_SIZE, ICON_STROKE } from "../../lib/iconSizes";

type AddFabSize = "sm" | "md" | "lg";

type AddFabProps = {
  size?: AddFabSize;
  /** When true, show “Add” text beside the icon (desktop header style). */
  withLabel?: boolean;
  label?: string;
  className?: string;
  onClick?: () => void;
  "aria-label"?: string;
  disabled?: boolean;
};

const sizeClass: Record<AddFabSize, string> = {
  sm: "h-11 w-11 rounded-2xl",
  md: "h-14 w-14 rounded-[1.25rem]",
  lg: "h-16 w-16 rounded-3xl",
};

const iconBySize: Record<AddFabSize, number> = {
  sm: ICON_SIZE.sm,
  md: ICON_SIZE.lg,
  lg: ICON_SIZE.hero,
};

/**
 * Shared primary “Add transaction” control.
 * Solid primary fill — no blue/indigo gradients — so themes stay consistent.
 */
export default function AddFab({
  size = "md",
  withLabel = false,
  label = "Add",
  className,
  onClick,
  disabled,
  "aria-label": ariaLabel = "Add transaction",
}: AddFabProps) {
  if (withLabel) {
    return (
      <motion.button
        type="button"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50",
          className
        )}
      >
        <Plus size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} aria-hidden />
        <span>{label}</span>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center justify-center bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-colors hover:bg-primary/90 disabled:opacity-50",
        sizeClass[size],
        className
      )}
    >
      <Plus size={iconBySize[size]} strokeWidth={ICON_STROKE} aria-hidden />
    </motion.button>
  );
}
