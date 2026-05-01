import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { CATEGORIES, INCOME_SOURCES } from "../types/expense";
import type { Expense, Income } from "../types/expense";
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
  editingIncome,
  onSuccess 
}: { 
  editingExpense?: Expense | null;
  editingIncome?: Income | null;
  onSuccess?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const { addXP } = useGamification(); 

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<string>(settings.defaultCategory || "Food");
  const [source, setSource] = useState<string>("Salary");
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
      setType("expense");
      setAmount(editingExpense.amount.toString());
      setCategory(editingExpense.category);
      setNote(editingExpense.note ?? "");
      setDate(editingExpense.date);
      setAccountId(editingExpense.accountId ?? "");
      setTripId(editingExpense.tripId ?? null);
      setCategoryTouched(true);
    } else if (editingIncome) {
      setType("income");
      setAmount(editingIncome.amount.toString());
      setSource(editingIncome.source);
      setNote(editingIncome.note ?? "");
      setDate(editingIncome.date);
      setAccountId(editingIncome.accountId ?? "");
      setCategoryTouched(true);
    } else {
      const last = localStorage.getItem("lastCategory");
      if (last) setCategory(last);
      setDate(new Date().toISOString().slice(0, 10));
      setCategoryTouched(false);
      const state = location.state as any;
      setTripId(state?.tripId ?? null);
    }
  }, [editingExpense, editingIncome]);

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
  const isLocked = !!(settings.lockPastMonths && (
    (editingExpense && editingExpense.month !== currentMonth) || 
    (editingIncome && editingIncome.month !== currentMonth)
  ));

  const submit = async () => {
    if (!user || !amount || !date) return;
    setIsSubmitting(true);
    try {
      const month = date.slice(0, 7);
      const collectionName = type === "expense" ? "expenses" : "incomes";

      const data: any = {
        amount: Number(amount),
        date,
        note,
        month,
        accountId,
      };

      if (type === "expense") {
        data.category = category;
        data.tripId = tripId || null;
        localStorage.setItem("lastCategory", category);
      } else {
        data.source = source;
      }

      const editingId = editingExpense?.id || editingIncome?.id;

      if (editingId) {
        await updateDoc(doc(db, "users", user.uid, collectionName, editingId), data);
        toast.success(`${type === "expense" ? "Expense" : "Income"} updated`);
      } else {
        await addDoc(collection(db, "users", user.uid, collectionName), {
          ...data,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: serverTimestamp(),
        });
        toast.success(`${type === "expense" ? "Expense" : "Income"} added`);
        if (type === "expense") addXP(10);

        // Proactive split suggestion (only for expenses)
        if (type === "expense" && shouldSuggestSplit(Number(amount), note)) {
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

      // Sync trip spending (only for expenses)
      if (type === "expense") {
        if (tripId) await syncTripSpentAmount(tripId);
        const oldTripId = editingExpense?.tripId;
        if (oldTripId && oldTripId !== tripId) await syncTripSpentAmount(oldTripId);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(type === "expense" ? "/expenses" : "/dashboard"); // Update this once IncomeListPage exists
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed to save ${type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
      <div className="flex p-1 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-white/5">
        <button
          type="button"
          onClick={() => setType("expense")}
          disabled={!!editingExpense || !!editingIncome}
          className={cn(
            "flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
            type === "expense" 
              ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => setType("income")}
          disabled={!!editingExpense || !!editingIncome}
          className={cn(
            "flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
            type === "income" 
              ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          Income
        </button>
      </div>

      <div className="relative">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Amount</label>
        <div className="relative group">
          <div className={cn(
            "absolute inset-0 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500",
            type === "expense" ? "bg-primary/20" : "bg-emerald-500/20"
          )} />
          <span className={cn(
            "absolute left-5 top-1/2 -translate-y-1/2 font-black text-2xl relative z-10",
            type === "expense" ? "text-primary" : "text-emerald-600 dark:text-emerald-400"
          )}>₹</span>
          <input
            type="number"
            autoFocus
            required
            className={cn(
              "w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl py-5 pl-12 pr-6 text-4xl font-black focus:outline-none focus:ring-0 transition-all shadow-xl relative z-10 placeholder:opacity-20",
              type === "expense" ? "text-slate-900 dark:text-white focus:border-primary" : "text-emerald-700 dark:text-emerald-100 focus:border-emerald-500"
            )}
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
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
            {type === "expense" ? "Category" : "Source"}
          </label>
          <div className="relative">
            <select
              className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-[1.25rem] px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200 appearance-none focus:outline-none focus:border-primary transition-all cursor-pointer"
              value={type === "expense" ? category : source}
              onChange={e => {
                if (type === "expense") {
                  setCategoryTouched(true);
                  setMatchedRule(null);
                  setCategory(e.target.value);
                } else {
                  setSource(e.target.value);
                }
              }}
            >
              {type === "expense" ? (
                <>
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
                </>
              ) : (
                INCOME_SOURCES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))
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
          placeholder={type === "expense" ? "What was this for?" : "Where did this come from?"}
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        {matchedRule && type === "expense" && !editingExpense && (
          <div className="mt-2 text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-primary" /> Auto-categorized: {matchedRule}
          </div>
        )}
      </div>

      {type === "expense" && (trips.filter(t => t.status === "active").length > 0 || !!tripId) && (
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
        disabled={(isSubmitting) || (isLocked)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "w-full py-5 rounded-2xl font-black text-white shadow-2xl transition-all mt-4 shine-effect uppercase tracking-[0.2em] text-xs",
          isLocked
            ? "bg-slate-400 cursor-not-allowed"
            : type === "expense" ? "bg-primary shadow-primary/20" : "bg-emerald-600 shadow-emerald-500/20"
        )}
      >
        {isLocked
          ? "🔒 Month Locked"
          : isSubmitting
            ? "Saving..."
            : type === "expense" 
              ? (editingExpense ? "Update Expense" : "Add Expense")
              : (editingIncome ? "Update Income" : "Add Income")
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
