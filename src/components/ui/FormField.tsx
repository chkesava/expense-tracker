import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type FormFieldProps = {
  id: string;
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  className?: string;
  optional?: boolean;
};

export default function FormField({
  id,
  label,
  children,
  hint,
  error,
  className,
  optional = false,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className="text-[11px] font-black uppercase tracking-widest text-muted-foreground"
      >
        {label}
        {optional ? " (optional)" : ""}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
