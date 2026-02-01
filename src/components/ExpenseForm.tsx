import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../types/expense";
import type { Category } from "../types/expense";
export default function ExpenseForm() {
  

  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<Category>("Food");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!user || !amount || !date) return;
    setIsSubmitting(true);
    try {
      localStorage.setItem("lastCategory", category);
      const now = new Date();
      await addDoc(collection(db, "users", user.uid, "expenses"), {
        amount: Number(amount),
        date,
        category,
        note,
        month: date.slice(0, 7),
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: serverTimestamp(),
      });

      setAmount("");
      setNote("");
      // reset date to today to make adding multiple expenses easier
      setDate(new Date().toISOString().slice(0, 10));
    } catch (err) {
      console.error(err);
      alert("Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  }; 
  useEffect(() => {
    const last = localStorage.getItem("lastCategory") as Category | null;
    if (last) setCategory(last);
  }, []);



  return (
    <form className="card" onSubmit={e => { e.preventDefault(); submit(); }}>
      <div className="form-title">Add Expense</div> 

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
            <option key={c} value={c}>
              {c}
            </option>
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
        {isSubmitting ? "Adding..." : "Add Expense"}
      </button>
    </form>
  );
}
