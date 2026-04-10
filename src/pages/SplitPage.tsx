import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSplits } from "../hooks/useSplits";
import { useAuth } from "../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  TrendingUp,
  Receipt
} from "lucide-react";
import { cn } from "../lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  }
};

export default function SplitPage() {
  const { splits, loading } = useSplits();
  const { user } = useAuth();
  const [filter, setFilter] = useState<"active" | "settled">("active");

  const summary = useMemo(() => {
    if (!user) return { toReceive: 0, toPay: 0 };
    
    return splits.reduce((acc, split) => {
      if (split.settled) return acc;

      split.participants.forEach(p => {
        if (p.paid) return;
        
        if (split.createdBy === user.uid) {
          // I created it, others owe me
          if (p.userId !== user.uid) {
            acc.toReceive += p.amount;
          }
        } else if (p.userId === user.uid) {
          // Someone else created it, I owe them
          acc.toPay += p.amount;
        }
      });
      
      return acc;
    }, { toReceive: 0, toPay: 0 });
  }, [splits, user]);

  const filteredSplits = splits.filter(s => filter === "active" ? !s.settled : s.settled);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.main
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-3xl mx-auto px-4 pt-20 pb-28 space-y-6"
    >
      {/* Header & Stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="text-blue-600" size={28} />
            Split Expenses
          </h1>
          <Link
            to="/split/create"
            className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={24} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <motion.div 
            variants={itemVariants}
            className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <div className="p-2 w-fit rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 mb-3">
              <TrendingUp size={20} />
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">To Receive</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">₹{summary.toReceive.toLocaleString()}</div>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <div className="p-2 w-fit rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 mb-3">
              <Receipt size={20} />
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">To Pay</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">₹{summary.toPay.toLocaleString()}</div>
          </motion.div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit mx-auto">
        {(["active", "settled"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize",
              filter === t 
                ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Splits List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredSplits.length > 0 ? (
            filteredSplits.map((split) => (
              <motion.div
                key={split.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                variants={itemVariants}
              >
                <Link
                  to={`/split/${split.id}`}
                  className="block p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-2xl",
                        split.settled 
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" 
                          : "bg-blue-50 dark:bg-blue-500/10 text-blue-600"
                      )}>
                        {split.settled ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {split.title}
                        </div>
                        <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                          Created by {split.createdBy === user?.uid ? "You" : (split.createdByName || "Others")}
                        </div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                          <span>{split.participants.length} people</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span>₹{split.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {split.createdBy === user?.uid ? (
                          <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-lg uppercase tracking-wider mb-1">
                            Receiving
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-lg uppercase tracking-wider mb-1">
                            Paying
                          </div>
                        )}
                        <div className="font-black text-slate-900 dark:text-white">
                          ₹{split.participants.reduce((sum, p) => p.userId === user?.uid ? p.amount : sum, 0).toLocaleString()}
                        </div>
                      </div>
                      <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" size={20} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center space-y-4"
            >
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Users size={32} />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">No {filter} splits</div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Time to group up and share expenses!</p>
              </div>
              <Link
                to="/split/create"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
              >
                <Plus size={20} />
                Create First Split
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}
