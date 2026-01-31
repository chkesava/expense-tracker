import { useExpenses } from "../hooks/useExpenses";
import { useMemo, useState, useEffect } from "react";
import MonthSelector from "../components/MonthSelector";
import ExpenseList from "../components/ExpenseList";
import { getMonthlySummary } from "../utils/monthSummary";

export default function ExpenseListPage() {
  const expenses = useExpenses();

  const months = useMemo(
    () => [...new Set(expenses.map(e => e.month))].sort().reverse(),
    [expenses]
  );

  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // ✅ FIX: set default month AFTER data loads
  useEffect(() => {
    if (!selectedMonth && months.length > 0) {
      setSelectedMonth(months[0]);
    }
  }, [months, selectedMonth]);

  const filteredExpenses = useMemo(
    () => expenses.filter(e => e.month === selectedMonth),
    [expenses, selectedMonth]
  );

  const summary = useMemo(
    () => getMonthlySummary(filteredExpenses),
    [filteredExpenses]
  );

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

        {/* Scrollable expense list */}
        <div className="card scroll-card">
          <ExpenseList expenses={filteredExpenses} />
        </div>
      </main>
    </>
  );
}
