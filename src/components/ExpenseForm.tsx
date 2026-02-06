import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../types/expense";
import type { Category, Expense } from "../types/expense";
import { toast } from 'react-toastify';
import useSettings from "../hooks/useSettings";
import { useGamification } from "../hooks/useGamification"; // Import
import { cn } from "../lib/utils";
import { motion } from "framer-motion";

export default function ExpenseForm({ editingExpense }: { editingExpense?: Expense | null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { addXP } = useGamification(); // Destructure

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<Category>(settings.defaultCategory as Category || "Food");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Online status
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

  // Initialize form
  useEffect(() => {
    if (editingExpense) {
      setAmount(editingExpense.amount.toString());
      setCategory(editingExpense.category);
      setNote(editingExpense.note ?? "");
      setDate(editingExpense.date);
    } else {
      const last = localStorage.getItem("lastCategory") as Category | null;
      if (last) setCategory(last);
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [editingExpense]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const isLocked = !!editingExpense && settings.lockPastMonths && editingExpense.month !== currentMonth;

  const submit = async () => {
    if (!user || !amount || !date) return;
    setIsSubmitting(true);
    try {
      const month = date.slice(0, 7);
      localStorage.setItem("lastCategory", category);

      const data = {
        amount: Number(amount),
        date,
        category,
        note,
        month,
      };

      if (editingExpense?.id) {
        await updateDoc(doc(db, "users", user.uid, "expenses", editingExpense.id), data);
        toast.success("Expense updated");
      } else {
        await addDoc(collection(db, "users", user.uid, "expenses"), {
          ...data,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: serverTimestamp(),
        });
        toast.success("Expense added");
        // Gamification: Award XP for tracking an expense
        addXP(10);
      }

      navigate("/expenses");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
      {/* Amount Input - Prominent */}
      <div className="relative">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">₹</span>
          <input
            type="number"
            autoFocus
            required
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
            placeholder="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Date Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Date</label>
          <input
            type="date"
            required
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        {/* Category Select */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Category</label>
          <div className="relative">
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              value={category}
              onChange={e => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
          </div>
        </div>
      </div>

      {/* Note Input */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Note (Optional)</label>
        <input
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          placeholder="What was this for?"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>

      {/* Submit Button */}
      <motion.button
        type="submit"
        disabled={(isSubmitting) || (!!editingExpense && isLocked)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "w-full py-3.5 rounded-2xl font-bold text-white shadow-lg transition-all mt-2",
          isLocked
            ? "bg-slate-400 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/30 hover:shadow-blue-500/40"
        )}
      >
        {isLocked && editingExpense
          ? "🔒 Month Locked"
          : isSubmitting
            ? "Saving..."
            : (editingExpense ? "Update Expense" : "Add Expense")
        }
      </motion.button>

      {/* Status Indicators */}
      <div className="flex justify-between items-center px-1">
        <span className={cn("text-xs font-medium flex items-center gap-1.5", isOnline ? "text-emerald-600" : "text-amber-600")}>
          <span className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-amber-500")} />
          {isOnline ? "Online & Syncing" : "Offline Mode"}
        </span>
      </div>
    </form>
  );
}