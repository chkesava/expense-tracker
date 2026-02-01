import { deleteDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import type { Expense } from "../types/expense";
import "../styles/form.css";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import ConfirmDialog from "./common/ConfirmDialog";

export default function ExpenseList({ expenses }: { expenses: Expense[] }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const doDelete = async (id?: string) => {
    if (!user || !id) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "expenses", id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete expense");
      setDeleteTarget(null);
    }
  };

  if (!expenses.length) {
    return <p style={{ fontSize: 13, color: "#6b7280" }}>No expenses</p>;
  }

  return (
    <div className="card">
      {expenses.map(e => (
        <div key={e.id} className="expense-row" onClick={() => navigate("/add", { state: e })}>
          <div className="expense-left">
            <span className="expense-category">{e.category}</span>
            {e.note && <span className="expense-note">{e.note}</span>}
            <span className="expense-date">{e.date}
{e.time && ` • ${e.time}`}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="small-btn muted-btn"
              onClick={(ev) => { ev.stopPropagation(); navigate("/add", { state: e }); }}
            >
              Edit
            </button>

            <div className="expense-amount">₹{e.amount}</div>

            <button
              className="small-btn danger-btn"
              onClick={(ev) => { ev.stopPropagation(); setDeleteTarget(e.id ?? null); }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete expense"
        message="Do you want to delete this expense? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => doDelete(deleteTarget ?? undefined)}
      />
    </div>
  );
}
