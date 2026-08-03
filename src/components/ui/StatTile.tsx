import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Card } from "./Card";

type StatTone = "default" | "success" | "warning" | "danger" | "info";

type StatTileProps = {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  tone?: StatTone;
  icon?: ReactNode;
  className?: string;
  /** Quiet label / loud value hierarchy for financial stats. */
  compact?: boolean;
};

const toneValueClass: Record<StatTone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
};

const toneDeltaClass: Record<StatTone, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
};

export function StatTile({
  label,
  value,
  delta,
  tone = "default",
  icon,
  className,
  compact = false,
}: StatTileProps) {
  return (
    <Card className={cn("flex flex-col gap-2", className)} padding={compact ? "sm" : "md"}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
          {label}
        </p>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
      <div className={cn("font-semibold tabular-nums tracking-tight", toneValueClass[tone], compact ? "text-xl" : "text-2xl md:text-3xl")}>
        {value}
      </div>
      {delta != null && delta !== "" && (
        <div
          className={cn(
            "inline-flex w-fit items-center rounded-lg px-2 py-0.5 text-xs font-semibold tabular-nums",
            toneDeltaClass[tone]
          )}
        >
          {delta}
        </div>
      )}
    </Card>
  );
}

export default StatTile;
