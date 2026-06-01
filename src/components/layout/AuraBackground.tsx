import { motion } from "framer-motion";
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
        <motion.div
          animate={{
            x: ["0%", "50%", "0%"],
            y: ["0%", "30%", "0%"],
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className={
            isGlass
              ? "absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-fuchsia-700 blur-[120px] opacity-70"
              : isClay
              ? "absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-pink-400 blur-[120px] opacity-70"
              : "absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-blue-400 dark:bg-indigo-600 blur-[100px] opacity-60"
          }
        />
        <motion.div
          animate={{
            x: ["0%", "-40%", "0%"],
            y: ["0%", "-50%", "0%"],
            scale: [1, 1.5, 1],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear", delay: 2 }}
          className={
            isGlass
              ? "absolute top-[10%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-rose-900 blur-[140px] opacity-60"
              : isClay
              ? "absolute top-[10%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-sky-400 blur-[130px] opacity-60"
              : "absolute top-[10%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-purple-400 dark:bg-fuchsia-700 blur-[120px] opacity-50"
          }
        />
        <motion.div
          animate={{
            x: ["0%", "30%", "0%"],
            y: ["0%", "-20%", "0%"],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: 5 }}
          className={
            isGlass
              ? "absolute -bottom-[20%] left-[10%] w-[80vw] h-[50vw] rounded-full bg-indigo-900 blur-[150px] opacity-55"
              : isClay
              ? "absolute -bottom-[20%] left-[10%] w-[80vw] h-[50vw] rounded-full bg-amber-300 blur-[140px] opacity-55"
              : "absolute -bottom-[20%] left-[10%] w-[80vw] h-[50vw] rounded-full bg-cyan-300 dark:bg-blue-800 blur-[130px] opacity-50"
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
