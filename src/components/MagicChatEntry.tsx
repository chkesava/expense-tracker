import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Calendar, Tag, CreditCard, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { parseMagicEntry, type ParsedExpense } from "../utils/magicParser";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { toast } from "react-toastify";
import { cn } from "../lib/utils";
import { useCategorizationRules } from "../hooks/useCategorizationRules";

interface MagicChatEntryProps {
  onSuccess?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  Travel: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  Shopping: "text-pink-500 bg-pink-500/10 border-pink-500/20",
  Utilities: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  Entertainment: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  Health: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  Education: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  Other: "text-slate-500 bg-slate-500/10 border-slate-500/20",
};

export default function MagicChatEntry({ onSuccess }: MagicChatEntryProps) {
  const { user } = useAuth();
  const { rules } = useCategorizationRules();
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedExpense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (input.trim().length > 2) {
      const result = parseMagicEntry(input);
      
      // Secondary category matching with user rules
      const normalizedInput = input.toLowerCase();
      const match = rules.find((rule) => normalizedInput.includes(rule.keyword.toLowerCase()));
      if (match) {
        result.category = match.category;
      }
      
      setParsed(result);
    } else {
      setParsed(null);
    }
  }, [input, rules]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !parsed || !parsed.amount) return;

    setIsSubmitting(true);
    try {
      const month = parsed.date.slice(0, 7);
      await addDoc(collection(db, "users", user.uid, "expenses"), {
        amount: parsed.amount,
        date: parsed.date,
        category: parsed.category,
        note: parsed.note,
        month,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: serverTimestamp(),
      });

      toast.success(`Saved: ₹${parsed.amount} in ${parsed.category}`, {
        icon: <CheckCircle2 className="text-emerald-500" />
      });
      setInput("");
      setParsed(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add magic expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-1 group">
      <motion.div 
        initial={false}
        animate={{ 
          scale: isFocused ? 1.02 : 1,
          y: isFocused ? -4 : 0
        }}
        className="relative"
      >
        {/* Animated Gradient Border */}
        <div className={cn(
          "absolute -inset-[2px] rounded-[2rem] blur-sm bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 opacity-20 transition-opacity duration-500",
          isFocused ? "opacity-40 animate-pulse" : "group-hover:opacity-30"
        )} />
        
        <form 
          onSubmit={handleSubmit}
          className={cn(
            "relative bg-white/80 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/50 dark:border-slate-800 rounded-[1.8rem] shadow-2xl overflow-hidden transition-all duration-500",
            isFocused ? "ring-2 ring-blue-500/20 dark:ring-blue-500/10 shadow-blue-500/10" : ""
          )}
        >
          <div className="p-2.5 flex items-center gap-3">
            <div className={cn(
              "pl-4 transition-colors duration-500",
              parsed?.amount ? "text-blue-500" : "text-slate-400"
            )}>
              <Sparkles size={22} className={cn(parsed?.amount ? "animate-spin-slow" : "animate-pulse")} />
            </div>
            
            <input
              ref={inputRef}
              type="text"
              placeholder="Record: 'Rs 500 for Starbucks today'..."
              className="flex-1 bg-transparent border-none focus:ring-0 py-4 text-slate-800 dark:text-slate-100 font-semibold text-lg placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:font-medium"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isSubmitting}
            />

            <AnimatePresence mode="wait">
              {parsed?.amount && (
                <motion.button
                  key="submit"
                  initial={{ scale: 0, opacity: 0, x: 20 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  exit={{ scale: 0, opacity: 0, x: 20 }}
                  whileHover={{ scale: 1.1, rotate: draftMode ? 0 : 5 }}
                  whileTap={{ scale: 0.9 }}
                  type="submit"
                  disabled={isSubmitting}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/40 mr-1 group/btn"
                >
                  {isSubmitting ? (
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <Send size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {parsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden"
              >
                <div className="p-4 flex flex-wrap gap-2.5 items-center">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-all hover:border-blue-500/30">
                    <span className="text-blue-500 font-black">₹</span>
                    <span className="text-lg">{parsed.amount?.toLocaleString() || "?"}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm">
                    <Calendar size={14} className="text-emerald-500" />
                    {new Date(parsed.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                  </div>
                  
                  <div className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 border rounded-xl text-sm font-bold shadow-sm transition-colors",
                    CATEGORY_COLORS[parsed.category] || CATEGORY_COLORS.Other
                  )}>
                    <Tag size={14} />
                    {parsed.category}
                  </div>

                  <div className="ml-auto hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-xl text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                    <Sparkles size={12} />
                    {parsed.note}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
      
      {/* Footer Hints */}
      <AnimatePresence>
        {!isFocused && !parsed && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 flex flex-wrap items-center justify-center gap-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest"
          >
            <div className="flex items-center gap-2 hover:text-blue-500 transition-colors cursor-default">
              <CreditCard size={12} />
              <span>₹1.5k for rent</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-2 hover:text-emerald-500 transition-colors cursor-default">
              <Sparkles size={12} />
              <span>Pizza last Friday</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-2 hover:text-purple-500 transition-colors cursor-default">
              <ChevronRight size={12} />
              <span>Netflix jan 12</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const draftMode = false;
