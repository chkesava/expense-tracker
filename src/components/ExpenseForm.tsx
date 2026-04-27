import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { CATEGORIES } from "../types/expense";
import type { Expense } from "../types/expense";
import { toast } from 'react-toastify';
import useSettings from "../hooks/useSettings";
import { useGamification } from "../hooks/useGamification"; // Import
import { cn } from "../lib/utils";
import { motion } from "framer-motion";
import { useCategorizationRules } from "../hooks/useCategorizationRules";
import { useTrips } from "../hooks/useTrips";
import { shouldSuggestSplit } from "../utils/proactiveSplits";
import { SplitSuggestionToast } from "./SplitSuggestionToast";

export default function ExpenseForm({ 
  editingExpense, 
  onSuccess 
}: { 
  editingExpense?: Expense | null;
  onSuccess?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const { addXP } = useGamification(); 

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<string>(settings.defaultCategory || "Food");
  const [accountId, setAccountId] = useState("");
  const [tripId, setTripId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [matchedRule, setMatchedRule] = useState<string | null>(null);

  const { accounts } = useAccounts();
  const { categories: userCategories } = useCategories();
  const { rules } = useCategorizationRules();
  const { trips, syncTripSpentAmount } = useTrips();

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

  useEffect(() => {
    if (editingExpense) {
      setAmount(editingExpense.amount.toString());
      setCategory(editingExpense.category);
      setNote(editingExpense.note ?? "");
      setDate(editingExpense.date);
      setAccountId(editingExpense.accountId ?? "");
      setTripId(editingExpense.tripId ?? null);
      setCategoryTouched(true);
    } else {
      const last = localStorage.getItem("lastCategory");
      if (last) setCategory(last);
      setDate(new Date().toISOString().slice(0, 10));
      setCategoryTouched(false);
      const state = location.state as any;
      setTripId(state?.tripId ?? null);
    }
  }, [editingExpense]);

  useEffect(() => {
    if (editingExpense || categoryTouched) return;

    const normalizedNote = note.trim().toLowerCase();
    if (!normalizedNote) {
      setMatchedRule(null);
      return;
    }

    const match = rules.find((rule) => normalizedNote.includes(rule.keyword.toLowerCase()));
    if (!match) {
      setMatchedRule(null);
      return;
    }

    setCategory(match.category);
    setMatchedRule(match.keyword);
  }, [note, rules, editingExpense, categoryTouched]);

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
        accountId,
        tripId: tripId || null,
      };

      const oldTripId = editingExpense?.tripId;

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
        addXP(10);

        // Proactive split suggestion
        if (shouldSuggestSplit(Number(amount), note)) {
          toast.info(
            ({ closeToast }) => (
              <SplitSuggestionToast 
                amount={Number(amount)} 
                note={note} 
                category={category}
                onSplit={(data) => navigate("/split", { state: { tab: "management", ...data } })}
                closeToast={closeToast}
              />
            ),
            { 
              autoClose: 10000,
              icon: false,
              className: "p-0 overflow-hidden rounded-2xl border border-blue-100 dark:border-blue-900 shadow-xl"
            }
          );
        }
      }

      // Sync trip spending
      if (tripId) await syncTripSpentAmount(tripId);
      if (oldTripId && oldTripId !== tripId) await syncTripSpentAmount(oldTripId);

      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/expenses");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
      <div className="relative">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Amount</label>
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-black text-2xl relative z-10">₹</span>
          <input
            type="number"
            autoFocus
            required
            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl py-5 pl-12 pr-6 text-4xl font-black text-slate-900 dark:text-white focus:outline-none focus:ring-0 focus:border-primary transition-all shadow-xl relative z-10 placeholder:opacity-20"
            placeholder="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Date</label>
          <input
            type="date"
            required
            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-[1.25rem] px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary transition-all"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Category</label>
          <div className="relative">
            <select
              className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-[1.25rem] px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200 appearance-none focus:outline-none focus:border-primary transition-all cursor-pointer"
              value={category}
              onChange={e => {
                setCategoryTouched(true);
                setMatchedRule(null);
                setCategory(e.target.value);
              }}
            >
              <optgroup label="Default">
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </optgroup>
              {userCategories.length > 0 && (
                <optgroup label="Custom">
                  {userCategories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
               <div className="w-5 h-5 flex items-center justify-center">▼</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Account</label>
        <div className="relative">
          <select
            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-[1.25rem] px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200 appearance-none focus:outline-none focus:border-primary transition-all cursor-pointer"
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
          >
            <option value="">Select Account</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
             <div className="w-5 h-5 flex items-center justify-center">▼</div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Note</label>
        <input
          className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-[1.25rem] px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary transition-all"
          placeholder="What was this for?"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        {matchedRule && !editingExpense && (
          <div className="mt-2 text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-primary" /> Auto-categorized: {matchedRule}
          </div>
        )}
      </div>

      {(trips.filter(t => t.status === "active").length > 0 || !!tripId) && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Attach to Trip (Optional)</label>
          <div className="relative">
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              value={tripId || ""}
              onChange={e => setTripId(e.target.value || null)}
            >
              <option value="">No Trip</option>
              {trips.filter(t => t.status === "active" || t.id === tripId).map(trip => (
                <option key={trip.id} value={trip.id}>{trip.destination} {trip.tripName ? `(${trip.tripName})` : ''}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
          </div>
        </div>
      )}

      <motion.button
        type="submit"
        disabled={(isSubmitting) || (!!editingExpense && isLocked)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "w-full py-5 rounded-2xl font-black text-white shadow-2xl transition-all mt-4 shine-effect uppercase tracking-[0.2em] text-xs",
          isLocked
            ? "bg-slate-400 cursor-not-allowed"
            : "bg-primary shadow-primary/20"
        )}
      >
        {isLocked && editingExpense
          ? "🔒 Month Locked"
          : isSubmitting
            ? "Saving..."
            : (editingExpense ? "Update Expense" : "Add Expense")
        }
      </motion.button>

      <div className="flex justify-between items-center px-1">
        <span className={cn("text-xs font-medium flex items-center gap-1.5", isOnline ? "text-emerald-600" : "text-amber-600")}>
          <span className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-amber-500")} />
          {isOnline ? "Online & Syncing" : "Offline Mode"}
        </span>
      </div>
    </form>
  );
}
