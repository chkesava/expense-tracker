import type { Expense } from "../../types/expense";
import {
  getHighestSpendingDay,
  getTopCategory,
  getAverageDailySpend,
} from "../../utils/smartSummary";
import Amount from "../common/Amount";


export default function SmartSummary({
  expenses,
}: {
  expenses: Expense[];
}) {
  if (!expenses.length) {
    return (
      <div style={{ padding: '0 4px' }}>
        <p style={{ fontSize: 14, color: "#6b7280" }}>
          No expenses for this month
        </p>
      </div>
    );
  }

  const highestDay = getHighestSpendingDay(expenses);
  const topCategory = getTopCategory(expenses);
  const avgDaily = getAverageDailySpend(expenses);

  return (
    <div style={{ color: '#1f2937' }}>
      <div style={{ fontSize: 15 }}>
        <div>
          📅 <strong>Highest day:</strong>{" "}
          {highestDay
            ? <span><Amount value={highestDay.amount} /> ({highestDay.date})</span>
            : "—"}
        </div>

        <div style={{ marginTop: 8 }}>
          🏷️ <strong>Top category:</strong>{" "}
          {topCategory
            ? <span>{topCategory.category} (<Amount value={topCategory.amount} />)</span>
            : "—"}
        </div>

        <div style={{ marginTop: 8 }}>
          📊 <strong>Avg per day:</strong> <Amount value={avgDaily} />
        </div>
      </div>
    </div>
  );
}
