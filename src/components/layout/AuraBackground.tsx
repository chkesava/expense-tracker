import { useTheme } from "../../hooks/useTheme";

export default function AuraBackground() {
  const { theme } = useTheme();
  const isGlass = theme === "glass-3d";
  const isClay = theme === "claymorphism";

  return (
    <div
      className={
        isGlass
          ? "fixed inset-0 pointer-events-none -z-20 overflow-hidden bg-[hsl(339_60%_6%)] transition-colors duration-1000"
          : isClay
          ? "fixed inset-0 pointer-events-none -z-20 overflow-hidden bg-[hsl(260_80%_98%)] transition-colors duration-1000"
          : "fixed inset-0 pointer-events-none -z-20 overflow-hidden bg-slate-50 dark:bg-[#020617] transition-colors duration-1000"
      }
    >
      <div
        className={
          isGlass
            ? "absolute inset-0 opacity-50 mix-blend-screen"
            : isClay
            ? "absolute inset-0 opacity-65 mix-blend-multiply"
            : "absolute inset-0 opacity-40 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen"
        }
      >
        {/* Blob 1 — use CSS animations instead of framer-motion for background blobs.
            CSS animations run on the compositor thread and don't block the main thread. */}
        <div
          className={
            isGlass
              ? "absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-fuchsia-700 blur-[80px] sm:blur-[120px] opacity-70 will-change-transform animate-aura-blob-1"
              : isClay
              ? "absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-pink-400 blur-[80px] sm:blur-[120px] opacity-70 will-change-transform animate-aura-blob-1"
              : "absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-blue-400 dark:bg-indigo-600 blur-[70px] sm:blur-[100px] opacity-60 will-change-transform animate-aura-blob-1"
          }
        />
        {/* Blob 2 */}
        <div
          className={
            isGlass
              ? "absolute top-[10%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-rose-900 blur-[90px] sm:blur-[140px] opacity-60 will-change-transform animate-aura-blob-2"
              : isClay
              ? "absolute top-[10%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-sky-400 blur-[85px] sm:blur-[130px] opacity-60 will-change-transform animate-aura-blob-2"
              : "absolute top-[10%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-purple-400 dark:bg-fuchsia-700 blur-[80px] sm:blur-[120px] opacity-50 will-change-transform animate-aura-blob-2"
          }
        />
        {/* Blob 3 */}
        <div
          className={
            isGlass
              ? "absolute -bottom-[20%] left-[10%] w-[80vw] h-[50vw] rounded-full bg-indigo-900 blur-[100px] sm:blur-[150px] opacity-55 will-change-transform animate-aura-blob-3"
              : isClay
              ? "absolute -bottom-[20%] left-[10%] w-[80vw] h-[50vw] rounded-full bg-amber-300 blur-[90px] sm:blur-[140px] opacity-55 will-change-transform animate-aura-blob-3"
              : "absolute -bottom-[20%] left-[10%] w-[80vw] h-[50vw] rounded-full bg-cyan-300 dark:bg-blue-800 blur-[85px] sm:blur-[130px] opacity-50 will-change-transform animate-aura-blob-3"
          }
        />
      </div>

      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
