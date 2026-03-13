import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../types/expense";
import type { Category, Expense } from "../types/expense";
import { toast } from "react-toastify";
import useSettings from "../hooks/useSettings";
import { useGamification } from "../hooks/useGamification";
import { cn } from "../lib/utils";

export default function ExpenseForm({ editingExpense }: { editingExpense?: Expense | null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { addXP } = useGamification();

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<Category>((settings.defaultCategory as Category) || "Food");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-5">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
          <input
            type="number"
            autoFocus
            required
            min={1}
            className="w-full bg-background border border-input rounded-lg py-3 pl-9 pr-4 text-xl font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date</label>
          <input
            type="date"
            required
            className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label>
          <select
            className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary cursor-pointer"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Note (optional)</label>
        <input
          type="text"
          className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
          placeholder="What was this for?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || (!!editingExpense && isLocked)}
        className={cn(
          "w-full py-3.5 rounded-xl font-medium text-primary-foreground transition-all hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed",
          isLocked ? "bg-muted" : "bg-gradient-primary shadow-glow"
        )}
      >
        {isLocked && editingExpense ? "Month locked" : isSubmitting ? "Saving…" : editingExpense?.id ? "Update expense" : "Add expense"}
      </button>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-success" : "bg-warning")} />
        {isOnline ? "Online" : "Offline — will sync when back online"}
      </p>
    </form>
  );
}
