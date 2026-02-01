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
    <div className="card">
      <strong>Monthly Comparison</strong>

      <div style={{ marginTop: 12, fontSize: 14 }}>
        <div>This month: ₹{result.currentTotal.toLocaleString()}</div>
        <div>Last month: ₹{result.previousTotal.toLocaleString()}</div>

        <div
          style={{
            marginTop: 8,
            color: isIncrease ? "#dc2626" : "#16a34a",
            fontWeight: 600,
          }}
        >
          {isIncrease ? "▲" : "▼"} {result.percent === null ? "—" : Math.abs(result.percent) + "%"}
        </div>
      </div>
    </div>
  );
}
