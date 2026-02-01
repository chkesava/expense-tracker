import type { Expense } from "../../types/expense";
import { groupByCategory } from "../../utils/analytics";

export default function CategoryBars({ expenses }: { expenses: Expense[] }) {
  if (!expenses.length) {
    return (
      <div className="card">
        <strong>Category Breakdown</strong>
        <p style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
          No data for this month
        </p>
      </div>
    );
  }

  const grouped = groupByCategory(expenses);
  const totals = Object.fromEntries(grouped.map(g => [g.category, g.value]));
  const grandTotal = Object.values(totals).reduce((sum, v) => sum + v, 0);

  // Sort categories by value desc for better UX
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  return (
    <div className="card">
      <strong>Category Breakdown</strong>

      <div style={{ marginTop: 12 }}>
        {sorted.map(([category, amount]) => {
          const percent = grandTotal === 0 ? 0 : Math.round((amount / grandTotal) * 100);

          return (
            <div key={category} style={{ marginBottom: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                }}
              >
                <span>{category}</span>
                <span>{percent}%</span>
              </div>

              <div
                style={{
                  height: 8,
                  background: "#e5e7eb",
                  borderRadius: 6,
                  overflow: "hidden",
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    width: `${percent}%`,
                    height: "100%",
                    background: "#2563eb",
                    borderRadius: 6,
                    transition: "width 300ms ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
