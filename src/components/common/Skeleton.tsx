import { cn } from "../../lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "rectangle" | "circle";
}

export function Skeleton({ className, variant = "rectangle", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-muted",
        variant === "circle" ? "rounded-full" : "rounded-2xl",
        className
      )}
      {...props}
    />
  );
}
