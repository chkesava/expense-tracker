import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

type SegmentItem<T extends string> = {
  id: T;
  label: string;
  icon?: ReactNode;
};

type SegmentedTabsProps<T extends string> = {
  items: SegmentItem<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
  ariaLabel: string;
  layoutId?: string;
};

export default function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  className,
  ariaLabel,
  layoutId = "segmented-tabs-pill",
}: SegmentedTabsProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn("flex gap-2 flex-wrap", className)}>
      {items.map((item) => {
        const isActive = value === item.id;
        return (
          <button
            key={item.id}
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${item.id}`}
            onClick={() => {
              if (!isActive) onChange(item.id);
            }}
            className={cn(
              "relative flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-widest transition-all",
              isActive
                ? "border-transparent text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-2xl bg-primary"
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {item.icon}
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
