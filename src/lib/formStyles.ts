/** Shared form control classes — prefer these over ad-hoc slate utilities. */
export const fieldClass =
  "w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors";

export const labelClass =
  "flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground ml-0.5";

export const segmentTrackClass =
  "flex p-1 rounded-xl border border-border bg-muted/50";

export const segmentActiveClass =
  "bg-card text-foreground shadow-sm border border-border";

export const segmentInactiveClass =
  "text-muted-foreground hover:text-foreground";
