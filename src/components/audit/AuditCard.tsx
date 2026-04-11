import { motion, useMotionValue, useTransform, useAnimation } from "framer-motion";
import { type Expense } from "../../types/expense";
import { Tag, FileText, Calendar, Clock, ArrowRight, ArrowLeft, ArrowUp } from "lucide-react";
import { cn } from "../../lib/utils";
import { useState } from "react";

interface AuditCardProps {
  expense: Expense;
  onSwipe: (direction: "left" | "right" | "up") => void;
  onAction: (action: "keep" | "edit" | "categorize", data?: any) => void;
}

export default function AuditCard({ expense, onSwipe }: AuditCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const controls = useAnimation();

  // Rotation and opacity transforms
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  
  // Badge opacities
  const keepOpacity = useTransform(x, [50, 150], [0, 1]);
  const editOpacity = useTransform(x, [-150, -50], [1, 0]);
  const categorizeOpacity = useTransform(y, [-150, -50], [1, 0]);

  const handleDragEnd = async (_: any, info: any) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      await controls.start({ x: 500, opacity: 0 });
      onSwipe("right");
    } else if (info.offset.x < -threshold) {
      await controls.start({ x: -500, opacity: 0 });
      onSwipe("left");
    } else if (info.offset.y < -threshold) {
      await controls.start({ y: -500, opacity: 0 });
      onSwipe("up");
    } else {
      controls.start({ x: 0, y: 0 });
    }
  };

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      animate={controls}
      style={{ x, y, rotate, opacity }}
      className="absolute inset-0 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden cursor-grab active:cursor-grabbing flex flex-col"
    >
      {/* Visual Feedback Badges */}
      <motion.div 
        style={{ opacity: keepOpacity }}
        className="absolute top-10 left-10 py-2 px-4 border-4 border-emerald-500 rounded-xl text-emerald-500 font-black text-2xl uppercase rotate-[-15deg] z-20 pointer-events-none"
      >
        Keep
      </motion.div>
      <motion.div 
        style={{ opacity: editOpacity }}
        className="absolute top-10 right-10 py-2 px-4 border-4 border-amber-500 rounded-xl text-amber-500 font-black text-2xl uppercase rotate-[15deg] z-20 pointer-events-none"
      >
        Edit
      </motion.div>
      <motion.div 
        style={{ opacity: categorizeOpacity }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 py-2 px-4 border-4 border-blue-500 rounded-xl text-blue-500 font-black text-2xl uppercase z-20 pointer-events-none"
      >
        Categorize
      </motion.div>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white flex flex-col items-center justify-center gap-2">
        <div className="text-sm font-bold opacity-80 uppercase tracking-widest">Amount</div>
        <div className="text-5xl font-black">₹{expense.amount.toLocaleString()}</div>
      </div>

      {/* Details */}
      <div className="flex-1 p-8 space-y-6">
        <div className="space-y-1">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Tag size={12} /> Category
          </div>
          <div className={cn(
            "text-xl font-bold p-3 rounded-2xl border transition-colors",
            (!expense.category || expense.category === "Other") 
              ? "bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400"
              : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white"
          )}>
            {expense.category || "Uncategorized"}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <FileText size={12} /> Note
          </div>
          <div className={cn(
            "text-base font-medium p-4 rounded-2xl border min-h-[100px] transition-colors",
            (!expense.note || expense.note.toLowerCase().includes("no note"))
              ? "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 italic"
              : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          )}>
            {expense.note || "No note provided"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Calendar size={12} /> Date
            </div>
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{expense.date}</div>
          </div>
          <div className="space-y-1 text-right">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1">
              <Clock size={12} /> Time
            </div>
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{expense.time || "--:--"}</div>
          </div>
        </div>
      </div>

      {/* Swipe Hints */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
        <div className="flex items-center gap-1 text-[10px] font-black text-amber-500 uppercase">
          <ArrowLeft size={12} /> Edit
        </div>
        <div className="flex items-center gap-1 text-[10px] font-black text-blue-500 uppercase">
          <ArrowUp size={12} /> Categorize
        </div>
        <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase">
          Keep <ArrowRight size={12} />
        </div>
      </div>
    </motion.div>
  );
}
