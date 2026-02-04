import type { Expense } from "../../types/expense";
import { getWeeklySummary } from "../../utils/weeklySummary";

export default function WeeklySummary({
  expenses,
  month,
}: {
  expenses: Expense[];
  month: string;
}) {
  const { weeks, currentWeekAvg, currentWeek, currentWeekDaysSoFar } = getWeeklySummary(expenses, month);

  if (!weeks.length) {
    return (
      <div className="card">
        <strong>Weekly Summary</strong>
        <p style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
          No data for this month
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginTop: 4 }}>
        {weeks.map((w) => (
          <div
            key={w.week}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 14,
              marginBottom: 8,
              paddingBottom: 8,
              borderBottom: "1px solid rgba(0,0,0,0.05)",
              color: w.total === 0 ? "#9ca3af" : "inherit",
            }}
          >
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>Week {w.week}</span>
              {currentWeek === w.week && (
                <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 500 }}>(Current)</span>
              )}
            </span>
            <span>₹{w.total.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {currentWeekAvg > 0 && (
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            color: "#2563eb",
            fontWeight: 600,
            textAlign: "right"
          }}
        >
          Daily avg: ₹{currentWeekAvg}
        </div>
      )}
    </div>
  );
}
