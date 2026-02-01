import { useExpenses } from "../hooks/useExpenses";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import MonthSelector from "../components/MonthSelector";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { getMonthlySummary } from "../utils/monthSummary";
import { groupExpensesByDay } from "../utils/dayGrouping";

export default function ExpenseListPage() {
  const expenses = useExpenses();

  const months = useMemo(
    () => [...new Set(expenses.map(e => e.month))].sort().reverse(),
    [expenses]
  );

  const [userSelectedMonth, setUserSelectedMonth] = useState<string | null>(null);
  const selectedMonth = userSelectedMonth ?? months[0] ?? "";

  const filteredExpenses = useMemo(
    () => expenses.filter(e => e.month === selectedMonth),
    [expenses, selectedMonth]
  );

  const summary = useMemo(
    () => getMonthlySummary(filteredExpenses),
    [filteredExpenses]
  );

  // group filtered expenses by day for sectioned listing
  const { today, yesterday, earlier } = groupExpensesByDay(filteredExpenses);

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

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <div className="app-title">Expenses</div>
      </header>

      <main className="app-container">
        {/* Month selector */}
        <MonthSelector
          months={months}
          value={selectedMonth}
          onChange={setUserSelectedMonth}
        />

        {/* Monthly summary */}
        <div className="card">
          <h3 className="form-title">Monthly Summary</h3>

          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            Total Spent: ₹{summary.total}
          </p>

          {filteredExpenses.length === 0 ? (
            <p style={{ fontSize: 12, color: "#6b7280" }}>
              No expenses for this month
            </p>
          ) : (
            Object.entries(summary.byCategory).map(([cat, amt]) => (
              <div
                key={cat}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  marginTop: 6,
                }}
              >
                <span>{cat}</span>
                <span>₹{amt}</span>
              </div>
            ))
          )}
        </div>

        {/* Scrollable expense list (grouped by day) */}
        <div className="card scroll-card">
          {filteredExpenses.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              No expenses found
            </p>
          ) : (
            <>
              {today.length > 0 && (
                <>
                  <h4 className="list-section-title">Today</h4>
                  {today.map((e) => (
                    <div key={e.id} className="expense-row" onClick={() => navigate("/add", { state: e })}>
                      <div className="expense-left">
                        <span className="expense-category">{e.category}</span>
                        {e.note && <span className="expense-note">{e.note}</span>}
                        <span className="expense-date">
                          {e.date}
                          {e.time && ` • ${e.time}`}
                        </span>
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
                </>
              )}

              {yesterday.length > 0 && (
                <>
                  <h4 className="list-section-title">Yesterday</h4>
                  {yesterday.map((e) => (
                    <div key={e.id} className="expense-row" onClick={() => navigate("/add", { state: e })}>
                      <div className="expense-left">
                        <span className="expense-category">{e.category}</span>
                        {e.note && <span className="expense-note">{e.note}</span>}
                        <span className="expense-date">
                          {e.date}
                          {e.time && ` • ${e.time}`}
                        </span>
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
                </>
              )}

              {earlier.length > 0 && (
                <>
                  <h4 className="list-section-title">Earlier</h4>
                  {earlier.map((e) => (
                    <div key={e.id} className="expense-row" onClick={() => navigate("/add", { state: e })}>
                      <div className="expense-left">
                        <span className="expense-category">{e.category}</span>
                        {e.note && <span className="expense-note">{e.note}</span>}
                        <span className="expense-date">
                          {e.date}
                          {e.time && ` • ${e.time}`}
                        </span>
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
                </>
              )}
            </>
          )}
        </div>

        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete expense"
          message="Do you want to delete this expense? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => doDelete(deleteTarget ?? undefined)}
        />
      </main>
    </>
  );
}
