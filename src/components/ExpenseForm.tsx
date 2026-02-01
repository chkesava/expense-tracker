import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../types/expense";
import type { Category, Expense } from "../types/expense";
import { toast } from 'react-toastify';
import useSettings from "../hooks/useSettings";
export default function ExpenseForm({
  editingExpense,}:{
  editingExpense?: Expense|null;
  
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // online / offline status
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // short saved confirmation shown after successful save, before navigation
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(false);

  // current month lock helper (respects user setting)
  const currentMonth = new Date().toISOString().slice(0, 7);

  const { settings } = useSettings();
  const isLocked = !!editingExpense && settings.lockPastMonths && editingExpense.month !== currentMonth;

useEffect(() => {
  if (editingExpense) {
    setAmount(editingExpense.amount.toString());
    setCategory(editingExpense.category);
    setNote(editingExpense.note ?? "");
    setDate(editingExpense.date);
  } else {
    const last = localStorage.getItem("lastCategory") as Category | null;
    if (last) setCategory(last);
    else setCategory(settings.defaultCategory as Category);
    setDate(new Date().toISOString().slice(0, 10));
  }
}, [editingExpense, settings.defaultCategory]);

const submit = async () => {
  if (!user || !amount || !date) return;
  setIsSubmitting(true);
  try {
    const month = date.slice(0, 7);
    localStorage.setItem("lastCategory", category);

    if (editingExpense?.id && user) {
      await updateDoc(doc(db, "users", user.uid, "expenses", editingExpense.id), {
        amount: Number(amount),
        date,
        category,
        note,
        month,
      });

      toast.success("Expense updated");
    } else {
      const now = new Date();
      await addDoc(collection(db, "users", user.uid, "expenses"), {
        amount: Number(amount),
        date,
        category,
        note,
        month,
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: serverTimestamp(),
      });

      toast.success("Expense added");
    }

    // show a short inline confirmation so the user sees the saved state before we navigate
    setShowSavedConfirmation(true);
    await new Promise((res) => setTimeout(res, 700));

    // navigate back to list
    navigate("/expenses");
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    toast.error(msg ?? "Failed to save expense");
  } finally {
    setIsSubmitting(false);
    // hide confirmation shortly after navigation or if error occurs
    setTimeout(() => setShowSavedConfirmation(false), 1000);
  }
};
  return (
    <form className="card" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="form-title">{editingExpense ? "Edit Expense" : "Add Expense"}</div> 

      <div className="form-group">
        <label className="form-label">Amount</label>
        <input
          className="form-input"
          type="number"
          placeholder="₹ Amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Date</label>
        <input
          className="form-input"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Category</label>
        <select
          className="form-select"
          value={category}
          onChange={e => setCategory(e.target.value as Category)}
        >
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Note</label>
        <input
          className="form-input"
          placeholder="Optional note"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={(isSubmitting && isOnline) || (!!editingExpense && isLocked)}
        className="primary-btn"
      >
        {isLocked && editingExpense ? "Past month locked" : isSubmitting ? (editingExpense ? "Updating..." : "Adding...") : (editingExpense ? "Update Expense" : "Add Expense")}
      </button>

      {isLocked && editingExpense && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
          This expense is from a past month and cannot be edited.
        </div>
      )}

      <p
        style={{
          marginTop: 8,
          fontSize: 12,
          color: isOnline ? "#16a34a" : "#d97706",
        }}
      >
        {isOnline ? "✓ Synced" : "Saved locally"}
      </p>

      {showSavedConfirmation && (
        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>
          Saved {isOnline ? "— ✓ Synced" : "— Saved locally"}
        </div>
      )}
    </form>
  );
}