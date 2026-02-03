import type { Expense } from "../../types/expense";
import { compareCurrentWithPrevious } from "../../utils/monthlyComparison";

export default function MonthlyComparison({
  expenses,
}: {
  expenses: Expense[];
}) {
  const result = compareCurrentWithPrevious(expenses);

  if (!result) {
    return (
      <div className="card">
        <strong>Monthly Comparison</strong>
        <p style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
          Not enough data to compare
        </p>
      </div>
    );
  }

  const isIncrease = result.diff >= 0;

  return (
    <div style={{ fontSize: 15, color: '#1f2937' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span>Current Month:</span>
          <strong>₹{result.currentTotal.toLocaleString()}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
          <span>Last Month:</span>
          <span>₹{result.previousTotal.toLocaleString()}</span>
        </div>

        <div
          style={{
            marginTop: 10,
            color: isIncrease ? "#dc2626" : "#16a34a",
            fontWeight: 600,
            background: isIncrease ? 'rgba(220, 38, 38, 0.1)' : 'rgba(22, 163, 74, 0.1)',
            padding: '6px 12px',
            borderRadius: 8,
            display: 'inline-block'
          }}
        >
          {isIncrease ? "▲" : "▼"} {result.percent === null ? "—" : Math.abs(result.percent) + "%"} vs last month
        </div>
      </div>
    </div>
  );
}
