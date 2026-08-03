import { useTheme } from "../../hooks/useTheme";

/** Soft ambient backdrop — intentionally quiet so content stays primary. */
export default function AuraBackground() {
  const { theme } = useTheme();
  const isGlass = theme === "glass-3d";
  const isClay = theme === "claymorphism";

  return (
    <div
      className={
        isGlass
          ? "fixed inset-0 -z-20 overflow-hidden bg-[hsl(339_60%_6%)] pointer-events-none transition-colors duration-700"
          : isClay
            ? "fixed inset-0 -z-20 overflow-hidden bg-[hsl(260_80%_98%)] pointer-events-none transition-colors duration-700"
            : "fixed inset-0 -z-20 overflow-hidden bg-background pointer-events-none transition-colors duration-700"
      }
    >
      <div
        className={
          isGlass
            ? "absolute inset-0 hidden opacity-20 mix-blend-screen sm:block"
            : isClay
              ? "absolute inset-0 hidden opacity-20 mix-blend-multiply sm:block"
              : "absolute inset-0 hidden opacity-12 mix-blend-multiply dark:opacity-15 dark:mix-blend-screen sm:block"
        }
      >
        <div
          className={
            isGlass
              ? "absolute -top-[20%] -left-[10%] h-[70vw] w-[70vw] rounded-full bg-fuchsia-700 opacity-35 blur-[100px] sm:blur-[140px] will-change-transform animate-aura-blob-1"
              : isClay
                ? "absolute -top-[20%] -left-[10%] h-[70vw] w-[70vw] rounded-full bg-pink-400 opacity-30 blur-[100px] sm:blur-[140px] will-change-transform animate-aura-blob-1"
                : "absolute -top-[20%] -left-[10%] h-[70vw] w-[70vw] rounded-full bg-primary/40 opacity-30 blur-[90px] sm:blur-[120px] will-change-transform animate-aura-blob-1"
          }
        />
        <div
          className={
            isGlass
              ? "absolute top-[10%] -right-[20%] h-[60vw] w-[60vw] rounded-full bg-rose-900 opacity-25 blur-[110px] sm:blur-[150px] will-change-transform animate-aura-blob-2"
              : isClay
                ? "absolute top-[10%] -right-[20%] h-[60vw] w-[60vw] rounded-full bg-sky-400 opacity-25 blur-[100px] sm:blur-[140px] will-change-transform animate-aura-blob-2"
                : "absolute top-[10%] -right-[20%] h-[60vw] w-[60vw] rounded-full bg-info/30 opacity-25 blur-[100px] sm:blur-[130px] will-change-transform animate-aura-blob-2"
          }
        />
      </div>

      <div
        className="absolute inset-0 opacity-[0.02] mix-blend-overlay dark:opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
