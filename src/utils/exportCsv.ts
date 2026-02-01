import type { Expense } from "../types/expense";

function formatValue(v: unknown) {
  const s = String(v ?? "");
  // escape double quotes by doubling them, wrap in quotes
  return `"${s.replace(/"/g, '""')}"`;
}

export function exportExpensesToCSV(expenses: Expense[], filename = "expenses.csv") {
  if (!expenses || expenses.length === 0) return;

  const headers = ["Date", "Time", "Category", "Amount", "Note"];

  const rows = expenses.map((e) => {
    // createdAt might be a Firestore Timestamp or a JS Date or a raw object
    let timeStr = "";
    const createdAt = (e as Expense).createdAt;

    if (createdAt) {
      // Timestamp-like with toDate()
      if (typeof (createdAt as { toDate?: () => Date }).toDate === "function") {
        timeStr = (createdAt as { toDate: () => Date }).toDate().toLocaleTimeString();
      } else if (typeof (createdAt as { seconds?: number }).seconds === "number") {
        timeStr = new Date((createdAt as { seconds: number }).seconds * 1000).toLocaleTimeString();
      } else if (createdAt instanceof Date) {
        timeStr = createdAt.toLocaleTimeString();
      } else if (typeof createdAt === "string" || typeof createdAt === "number") {
        timeStr = String(createdAt);
      }
    }

    return [e.date ?? "", timeStr, e.category ?? "", e.amount ?? "", e.note ?? ""];
  });

  const csvContent = [headers.join(","),
    ...rows.map((r) => r.map(formatValue).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  // For Firefox it is necessary to add the link to the DOM
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
