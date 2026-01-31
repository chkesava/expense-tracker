import { useMemo, useState } from "react";

import ExpenseForm from "../components/ExpenseForm";
import ExpenseList from "../components/ExpenseList";
import MonthSelector from "../components/MonthSelector";
import CategoryPie from "../components/charts/CategoryPie";
import MonthlyBar from "../components/charts/MonthlyBar";
import TrendLine from "../components/charts/TrendLine";
import "../styles/form.css";
import { useExpenses } from "../hooks/useExpenses";
import { groupByCategory, groupByMonth } from "../utils/analytics";

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const expenses = useExpenses();

  /* ----------------------------------
   * Months (unique, sorted, latest first)
   * ---------------------------------- */
  const months = useMemo(() => {
    return Array.from(new Set(expenses.map(e => e.month)))
      .sort()
      .reverse();
  }, [expenses]);

  /* ----------------------------------
   * Selected month (derived correctly)
   * ---------------------------------- */
  const [userSelectedMonth, setUserSelectedMonth] = useState<string | null>(null);

  const selectedMonth = userSelectedMonth ?? months[0] ?? "";

  /* ----------------------------------
   * Filtered expenses (month-wise)
   * ---------------------------------- */
  const filteredExpenses = useMemo(() => {
    if (!selectedMonth) return [];
    return expenses.filter(e => e.month === selectedMonth);
  }, [expenses, selectedMonth]);

  /* ----------------------------------
   * Monthly total
   * ---------------------------------- */
  const monthlyTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  /* ----------------------------------
   * Analytics data
   * ---------------------------------- */
  const categoryData = useMemo(
    () => groupByCategory(filteredExpenses),
    [filteredExpenses]
  );

  const monthlyData = useMemo(
    () => groupByMonth(expenses),
    [expenses]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="app-header">
        <div className="app-title">Expense Tracker</div>
        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>
      </header>
      {/* Main content */}
      <main className="app-container ">
        {/* Add expense */}
        <ExpenseForm />

        {/* Month selector */}
        {months.length > 0 && (
          <MonthSelector
            months={months}
            value={selectedMonth}
            onChange={setUserSelectedMonth}
          />
        )}

        {/* Monthly summary */}
        {selectedMonth && (
          <section className="bg-white rounded-xl shadow p-4">
            <div className="card">
              <div className="form-label">Total spent</div>
              <div style={{ fontSize: "20px", fontWeight: 600 }}>
                ₹{monthlyTotal}
              </div>
          </div>
          </section>
        )}

        {/* Category split */}
        <section className="bg-white rounded-xl shadow p-4">
          <h2 className="text-sm font-medium mb-2">Category Split</h2>
          <CategoryPie data={categoryData} />
        </section>

        {/* Monthly spend */}
        <section className="bg-white rounded-xl shadow p-4">
          <h2 className="text-sm font-medium mb-2">Monthly Spend</h2>
          <MonthlyBar data={monthlyData} />
        </section>

        {/* Spending trend */}
        <section className="bg-white rounded-xl shadow p-4">
          <h2 className="text-sm font-medium mb-2">Spending Trend</h2>
          <TrendLine data={monthlyData} />
        </section>

        {/* Expense list */}
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-gray-700">Expenses</h2>
          <ExpenseList expenses={filteredExpenses} />
        </section>
      </main>
    </div>
  );
}
