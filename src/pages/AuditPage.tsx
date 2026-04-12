import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Tag, Sparkles } from "lucide-react";
import { useExpenses } from "../hooks/useExpenses";
import { useAuth } from "../hooks/useAuth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";
import AuditCard from "../components/audit/AuditCard";
import AuditControls from "../components/audit/AuditControls";
import { CATEGORIES } from "../types/expense";
import { Skeleton } from "../components/common/Skeleton";
import Modal from "../components/common/Modal";
import ExpenseForm from "../components/ExpenseForm";

export default function AuditPage() {
  const { expenses, loading } = useExpenses();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  // Filter expenses that need auditing
  const auditableExpenses = useMemo(() => {
    return expenses.filter(e => {
      const needsCategory = !e.category || e.category === "Other" || e.category === "Uncategorized";
      const needsNote = !e.note || e.note.trim() === "" || e.note.toLowerCase().includes("no note");
      
      // If we add an isAudited flag later, we can check it here
      // return (needsCategory || needsNote) && !e.isAudited;
      return (needsCategory || needsNote);
    });
  }, [expenses]);

  const currentExpense = auditableExpenses[currentIndex];
  const total = auditableExpenses.length;
  const remaining = total - currentIndex;

  const handleAction = async (action: "keep" | "edit" | "categorize" | "update-category", data?: any) => {
    if (!user || !currentExpense?.id) return;

    try {
      if (action === "keep") {
        // Mark as audited / confirmed
        const expenseRef = doc(db, "users", user.uid, "expenses", currentExpense.id);
        await updateDoc(expenseRef, {
          isAudited: true,
          lastAuditedAt: new Date().toISOString()
        });
        toast.success("Confirmed!");
      } else if (action === "categorize") {
        setShowCategoryPicker(true);
        return; // Don't move index yet
      } else if (action === "edit") {
        setEditingExpense(currentExpense);
        return; // Don't move index yet
      } else if (action === "update-category" && data?.category) {
        const expenseRef = doc(db, "users", user.uid, "expenses", currentExpense.id);
        await updateDoc(expenseRef, {
          category: data.category,
          isAudited: true
        });
        toast.success(`Categorized as ${data.category}`);
        setShowCategoryPicker(false);
      }
      
      // Move to next card
      setCurrentIndex(prev => prev + 1);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update expense");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] pt-20 px-4 flex flex-col items-center">
        <Skeleton className="h-8 w-48 mb-8" />
        <Skeleton className="h-[400px] w-full max-w-md rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 pt-20 pb-32 px-4 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Audit Session</h1>
          <p className="text-xs text-slate-500 font-medium">
            {remaining > 0 ? `${remaining} remaining` : "All caught up!"}
          </p>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-md h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mb-12 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(currentIndex / total) * 100}%` }}
          className="h-full bg-blue-600"
        />
      </div>

      {/* Card Stack */}
      <div className="relative w-full max-w-md aspect-[3/4] mb-12">
        <AnimatePresence mode="popLayout">
          {remaining > 0 ? (
            <AuditCard 
              key={currentExpense.id}
              expense={currentExpense}
              onSwipe={(dir) => {
                if (dir === "right") handleAction("keep");
                if (dir === "left") handleAction("edit");
                if (dir === "up") handleAction("categorize");
              }}
              onAction={handleAction}
            />
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                <Check size={40} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Clean as a Whistle!</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">You've audited all your pending expenses. Great job!</p>
              <button 
                onClick={() => navigate("/dashboard")}
                className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
              >
                Back to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {remaining > 0 && (
        <AuditControls onAction={(action: "keep" | "edit" | "categorize") => {
          if (action === "keep") handleAction("keep");
          if (action === "edit") handleAction("edit");
          if (action === "categorize") handleAction("categorize");
        }} />
      )}

      {/* Category Picker Overlay */}
      <AnimatePresence>
        {showCategoryPicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-end justify-center sm:items-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl border border-white/20"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Quick Categorize</h3>
                <button onClick={() => setShowCategoryPicker(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {CATEGORIES.map(category => (
                  <button 
                    key={category}
                    onClick={() => handleAction("update-category", { category })}
                    className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-200 dark:hover:border-blue-500/20 group transition-all"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors font-bold uppercase text-xs">
                      {category[0]}
                    </div>
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors">
                      {category}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <Modal 
        isOpen={!!editingExpense} 
        onClose={() => setEditingExpense(null)}
        title="Edit & Confirm"
      >
        <ExpenseForm 
          editingExpense={editingExpense} 
          onSuccess={() => {
            setEditingExpense(null);
            setCurrentIndex(prev => prev + 1);
          }} 
        />
      </Modal>
    </div>
  );
}
