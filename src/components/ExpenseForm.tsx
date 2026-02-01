import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../types/expense";
import type { Category, Expense } from "../types/expense";
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
    }

    // navigate back to list
    navigate("/expenses");
  } catch (err) {
    console.error(err);
    alert("Failed to save expense");
  } finally {
    setIsSubmitting(false);
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

      <button type="submit" disabled={isSubmitting} className="primary-btn">
        {isSubmitting ? (editingExpense ? "Updating..." : "Adding...") : (editingExpense ? "Update Expense" : "Add Expense")}
      </button>
    </form>
  );
}