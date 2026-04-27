import { motion } from "framer-motion";

export default function AuraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"
      />
      <motion.div
        animate={{
          x: [0, -100, 0],
          y: [0, -50, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
          delay: 2,
        }}
        className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] bg-indigo-500/10 rounded-full blur-[100px]"
      />
      <motion.div
        animate={{
          x: [0, 50, 0],
          y: [0, 100, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear",
          delay: 5,
        }}
        className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] bg-blue-400/10 rounded-full blur-[90px]"
      />
    </div>
  );
}
