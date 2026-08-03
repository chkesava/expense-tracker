/** Canonical Lucide icon sizes — prefer these over ad-hoc pixel values. */
export const ICON_SIZE = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  hero: 32,
} as const;

export type IconSize = keyof typeof ICON_SIZE;

/** Default Lucide stroke width for product UI. */
export const ICON_STROKE = 2;
