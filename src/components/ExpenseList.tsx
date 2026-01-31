import type { Expense } from "../types/expense";
import "../styles/form.css";
export default function ExpenseList({ expenses }: { expenses: Expense[] }) {
  if (!expenses.length) {
    return <p style={{ fontSize: 13, color: "#6b7280" }}>No expenses</p>;
  }

  return (
    <div className="card">
      {expenses.map(e => (
        <div key={e.id} className="expense-row">
          <div className="expense-left">
            <span className="expense-category">{e.category}</span>
            {e.note && <span className="expense-note">{e.note}</span>}
            <span className="expense-date">{e.date}</span>
          </div>
          <div className="expense-amount">₹{e.amount}</div>
        </div>
      ))}
    </div>
  );
}
