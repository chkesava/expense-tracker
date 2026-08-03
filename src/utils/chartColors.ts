/**
 * Chart color helpers. Prefer `chartTokens()` / `getChartColor()` so charts
 * can follow the design-token primary/success/warning/info cascade.
 * `COLORS` is kept for backward compatibility with existing chart call sites.
 */

/** Fallback hex series when CSS variables are unavailable (SSR / tests). */
export const COLORS = [
  "#4f46e5", // primary-ish indigo
  "#16a34a", // success
  "#f59e0b", // warning
  "#2563eb", // info
  "#dc2626", // destructive
  "#0d9488", // teal
  "#9333ea", // violet
  "#ea580c", // orange
  "#10b981", // emerald
  "#3b82f6", // sky
  "#8b5cf6", // indigo
  "#db2777", // pink
  "#14b8a6", // cyan
  "#f97316", // amber
  "#ef4444", // crimson
];

const TOKEN_VARS = [
  "--primary",
  "--success",
  "--warning",
  "--info",
  "--destructive",
  "--accent-foreground",
  "--muted-foreground",
] as const;

function readCssHsl(varName: string): string | null {
  if (typeof document === "undefined") return null;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return null;
  // Tokens are stored as "H S% L%" (optional / alpha)
  return `hsl(${raw})`;
}

export type ChartTokenSet = {
  primary: string;
  success: string;
  warning: string;
  info: string;
  destructive: string;
  muted: string;
  foreground: string;
  border: string;
  card: string;
  tooltipBg: string;
  tooltipBorder: string;
  series: string[];
};

/** Theme-aware chart palette resolved from CSS design tokens at call time. */
export function chartTokens(): ChartTokenSet {
  const primary = readCssHsl("--primary") ?? COLORS[0];
  const success = readCssHsl("--success") ?? COLORS[1];
  const warning = readCssHsl("--warning") ?? COLORS[2];
  const info = readCssHsl("--info") ?? COLORS[3];
  const destructive = readCssHsl("--destructive") ?? COLORS[4];
  const muted = readCssHsl("--muted-foreground") ?? "#94a3b8";
  const foreground = readCssHsl("--foreground") ?? "#0f172a";
  const border = readCssHsl("--border") ?? "#e2e8f0";
  const card = readCssHsl("--card") ?? "#ffffff";

  const series = TOKEN_VARS.map((name, i) => readCssHsl(name) ?? COLORS[i % COLORS.length]);

  // Extend series with static accents so multi-slice charts stay distinct
  const extended = [...series, ...COLORS.filter((c) => !series.includes(c))];

  return {
    primary,
    success,
    warning,
    info,
    destructive,
    muted,
    foreground,
    border,
    card,
    tooltipBg: card,
    tooltipBorder: border,
    series: extended,
  };
}

export function getChartColor(index: number, tokens?: ChartTokenSet): string {
  const series = tokens?.series ?? chartTokens().series;
  return series[index % series.length];
}

/** Shared Recharts tooltip chrome — theme-aware. */
export function chartTooltipStyle(tokens?: ChartTokenSet): Record<string, string | number> {
  const t = tokens ?? chartTokens();
  return {
    backgroundColor: t.tooltipBg,
    borderRadius: 12,
    border: `1px solid ${t.tooltipBorder}`,
    color: t.foreground,
    boxShadow: "none",
  };
}

export function chartAxisTick(tokens?: ChartTokenSet) {
  const t = tokens ?? chartTokens();
  return { fontSize: 11, fill: t.muted };
}
