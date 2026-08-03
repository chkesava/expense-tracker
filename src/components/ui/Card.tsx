import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Enables subtle lift on hover for clickable surfaces. */
  interactive?: boolean;
  /** Padding density. */
  padding?: "none" | "sm" | "md" | "lg";
};

const paddingMap = {
  none: "p-0",
  sm: "p-3 md:p-4",
  md: "p-4 md:p-5",
  lg: "p-5 md:p-6",
} as const;

export function Card({
  className,
  interactive = false,
  padding = "md",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "bento-card",
        paddingMap[padding],
        interactive &&
          "cursor-pointer transition-transform duration-200 ease-out hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type CardHeaderProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export function CardHeader({
  className,
  title,
  description,
  action,
  children,
  ...props
}: CardHeaderProps) {
  if (children) {
    return (
      <div className={cn("mb-3 flex items-start justify-between gap-3", className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("mb-3 flex items-start justify-between gap-3", className)} {...props}>
      <div className="min-w-0">
        {title && (
          <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
            {title}
          </h3>
        )}
        {description && (
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("min-w-0", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-4 flex items-center justify-between gap-3 border-t border-border pt-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
