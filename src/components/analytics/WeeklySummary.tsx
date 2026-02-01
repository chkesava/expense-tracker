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
    <div className="card">
      <strong>Weekly Summary</strong>

      <div style={{ marginTop: 12 }}>
        {weeks.map((w) => (
          <div
            key={w.week}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 14,
              marginBottom: 6,
              color: w.total === 0 ? "#9ca3af" : "inherit",
            }}
          >
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>Week {w.week}</span>
              {currentWeek === w.week && (
                <span style={{ fontSize: 11, color: '#2563eb' }}>(This week)</span>
              )}
            </span>
            <span>₹{w.total}</span>
          </div>
        ))}
      </div>

      {currentWeekAvg > 0 && (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: "#2563eb",
            fontWeight: 600,
          }}
        >
          Daily avg (this week): ₹{currentWeekAvg}
          {currentWeekDaysSoFar && currentWeekDaysSoFar < 7 && (
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400, marginLeft: 8 }}>
              (avg over {currentWeekDaysSoFar} day{currentWeekDaysSoFar > 1 ? 's' : ''})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
