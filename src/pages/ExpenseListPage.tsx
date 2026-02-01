import { useExpenses } from "../hooks/useExpenses";
import { useMemo, useState, useEffect } from "react";
import MonthSelector from "../components/MonthSelector";
import ExpenseList from "../components/ExpenseList";
import { getMonthlySummary } from "../utils/monthSummary";
import { groupExpensesByDay } from "../utils/dayGrouping";

export default function ExpenseListPage() {
  const expenses = useExpenses();

  const months = useMemo(
    () => [...new Set(expenses.map(e => e.month))].sort().reverse(),
    [expenses]
  );

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return months.length > 0 ? months[0] : "";
  });

  useEffect(() => {
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[0]);
    }
  }, [months]);

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
          onChange={setSelectedMonth}
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
                    <div key={e.id} className="expense-row">
                      <div className="expense-left">
                        <span className="expense-category">{e.category}</span>
                        {e.note && <span className="expense-note">{e.note}</span>}
                        <span className="expense-date">
                          {e.date}
                          {e.time && ` • ${e.time}`}
                        </span>
                      </div>
                      <div className="expense-amount">₹{e.amount}</div>
                    </div>
                  ))}
                </>
              )}

              {yesterday.length > 0 && (
                <>
                  <h4 className="list-section-title">Yesterday</h4>
                  {yesterday.map((e) => (
                    <div key={e.id} className="expense-row">
                      <div className="expense-left">
                        <span className="expense-category">{e.category}</span>
                        {e.note && <span className="expense-note">{e.note}</span>}
                        <span className="expense-date">
                          {e.date}
                          {e.time && ` • ${e.time}`}
                        </span>
                      </div>
                      <div className="expense-amount">₹{e.amount}</div>
                    </div>
                  ))}
                </>
              )}

              {earlier.length > 0 && (
                <>
                  <h4 className="list-section-title">Earlier</h4>
                  {earlier.map((e) => (
                    <div key={e.id} className="expense-row">
                      <div className="expense-left">
                        <span className="expense-category">{e.category}</span>
                        {e.note && <span className="expense-note">{e.note}</span>}
                        <span className="expense-date">
                          {e.date}
                          {e.time && ` • ${e.time}`}
                        </span>
                      </div>
                      <div className="expense-amount">₹{e.amount}</div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
