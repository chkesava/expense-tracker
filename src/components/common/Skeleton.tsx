import { cn } from "../../lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "rectangle" | "circle";
}

export function Skeleton({ className, variant = "rectangle", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-slate-200 dark:bg-slate-800/80",
        variant === "circle" ? "rounded-full" : "rounded-2xl",
        className
      )}
      {...props}
    />
  );
}
