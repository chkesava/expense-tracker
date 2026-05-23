import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type WidthTier = "focus" | "standard" | "wide";

type PageShellProps = {
  embedded?: boolean;
  width?: WidthTier;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

const widthClassByTier: Record<WidthTier, string> = {
  focus: "max-w-2xl",
  standard: "max-w-6xl",
  wide: "max-w-7xl",
};

export default function PageShell({
  embedded = false,
  width = "standard",
  children,
  className,
  contentClassName,
}: PageShellProps) {
  if (embedded) {
    return <div className={cn("space-y-6", className)}>{children}</div>;
  }

  return (
    <main className={cn("mx-auto w-full px-4 pb-32 pt-24 md:px-6", widthClassByTier[width], className)}>
      <div className={cn("space-y-6", contentClassName)}>{children}</div>
    </main>
  );
}
