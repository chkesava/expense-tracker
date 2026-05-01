import { motion } from "framer-motion";

export default function AuraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden bg-slate-50 dark:bg-[#020617] transition-colors duration-1000">
      {/* Mesh Gradient Background layers */}
      <div className="absolute inset-0 opacity-40 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen">
        <motion.div
          animate={{
            x: ["0%", "50%", "0%"],
            y: ["0%", "30%", "0%"],
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-blue-400 dark:bg-indigo-600 blur-[100px] opacity-60"
        />
        <motion.div
          animate={{
            x: ["0%", "-40%", "0%"],
            y: ["0%", "-50%", "0%"],
            scale: [1, 1.5, 1],
            rotate: [0, -90, 0]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear", delay: 2 }}
          className="absolute top-[10%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-purple-400 dark:bg-fuchsia-700 blur-[120px] opacity-50"
        />
        <motion.div
          animate={{
            x: ["0%", "30%", "0%"],
            y: ["0%", "-20%", "0%"],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: 5 }}
          className="absolute -bottom-[20%] left-[10%] w-[80vw] h-[50vw] rounded-full bg-cyan-300 dark:bg-blue-800 blur-[130px] opacity-50"
        />
      </div>

      {/* Subtle Noise Texture for a premium feel */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
    </div>
  );
}
