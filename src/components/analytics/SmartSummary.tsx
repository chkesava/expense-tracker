import type { Expense } from "../../types/expense";
import {
  getHighestSpendingDay,
  getTopCategory,
  getAverageDailySpend,
} from "../../utils/smartSummary";

export default function SmartSummary({
  expenses,
}: {
  expenses: Expense[];
}) {
  if (!expenses.length) {
    return (
      <div className="card">
        <strong>Smart Summary</strong>
        <p style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
          No expenses for this month
        </p>
      </div>
    );
  }

  const highestDay = getHighestSpendingDay(expenses);
  const topCategory = getTopCategory(expenses);
  const avgDaily = getAverageDailySpend(expenses);

  return (
    <div className="card">
      <strong>Smart Summary</strong>

      <div style={{ marginTop: 12, fontSize: 14 }}>
        <div>
          📅 <strong>Highest day:</strong>{" "}
          {highestDay
            ? `₹${highestDay.amount} (${highestDay.date})`
            : "—"}
        </div>

        <div style={{ marginTop: 6 }}>
          🏷️ <strong>Top category:</strong>{" "}
          {topCategory
            ? `${topCategory.category} (₹${topCategory.amount})`
            : "—"}
        </div>

        <div style={{ marginTop: 6 }}>
          📊 <strong>Avg per day:</strong> ₹{avgDaily}
        </div>
      </div>
    </div>
  );
}
