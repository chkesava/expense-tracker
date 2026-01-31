import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../types/expense";
import type { Category } from "../types/expense";
export default function ExpenseForm() {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [note, setNote] = useState("");

  const submit = async () => {
    if (!user || !amount || !date) return;

    await addDoc(collection(db, "users", user.uid, "expenses"), {
      amount: Number(amount),
      date,
      category,
      note,
      month: date.slice(0, 7),
      createdAt: serverTimestamp(),
    });

    setAmount("");
    setNote("");
  };

  return (
    <div className="card">
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
            <option key={c}>{c}</option>
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

      <button onClick={submit} className="primary-btn">
        Add Expense
      </button>
    </div>
  );
}
