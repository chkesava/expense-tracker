import MonthSelector from "../components/MonthSelector";
import "../styles/form.css";
import { useExpenses } from "../hooks/useExpenses";
import { useMemo, useState } from "react";
import { groupByCategory, groupByMonth } from "../utils/analytics";
import { CATEGORIES } from "../types/expense";
import { useAuth } from "../hooks/useAuth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";
import useSettings from "../hooks/useSettings";

export default function Dashboard() {
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



  const { user } = useAuth();
  const { settings } = useSettings();
  const [isAdding, setIsAdding] = useState(false);

  const quickAddDirect = async (category: string, amount: number) => {
    if (!user) return toast.error("Sign in to add expenses");
    setIsAdding(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      const month = date.slice(0, 7);
      const now = new Date();
      await addDoc(collection(db, "users", user.uid, "expenses"), {
        amount: Number(amount),
        date,
        category,
        note: "",
        month,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: serverTimestamp(),
      });
      toast.success("Expense added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add expense");
    } finally {
      setIsAdding(false);
    }
  };

  const topCategories = useMemo(() => {
    const grouped = groupByCategory(filteredExpenses);
    return grouped.sort((a, b) => b.value - a.value).slice(0, 3);
  }, [filteredExpenses]);

  const monthlyComparison = useMemo(() => {
    const byMonth = groupByMonth(expenses); // monthly totals
    const current = byMonth.find(m => m.month === selectedMonth)?.value ?? 0;
    const idx = byMonth.findIndex(m => m.month === selectedMonth);
    const prev = idx >= 0 && byMonth[idx + 1] ? byMonth[idx + 1].value : 0;
    const change = prev === 0 ? 0 : Math.round(((current - prev) / prev) * 100);
    return { current, prev, change };
  }, [expenses, selectedMonth]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="app-container page-enter grid gap-4 md:grid-cols-3">
        {/* LEFT – Quick Add & Month selector */}
        <div className="space-y-4">
          {months.length > 0 && (
            <MonthSelector
              months={months}
              value={selectedMonth}
              onChange={setUserSelectedMonth}
            />
          )}

          <section className="card hover-lift">
            <strong>Quick Add</strong>
            <div style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>Tap a preset to add quickly</div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.slice(0, 6).map(c => (
                <button key={c} className="small-btn" onClick={() => quickAddDirect(c, 100)} disabled={isAdding}>{c} • ₹100</button>
              ))}
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button className="small-btn" onClick={() => quickAddDirect('Food', 50)} disabled={isAdding}>₹50</button>
              <button className="small-btn" onClick={() => quickAddDirect('Transport', 100)} disabled={isAdding}>₹100</button>
              <button className="small-btn" onClick={() => quickAddDirect('Other', 200)} disabled={isAdding}>₹200</button>
            </div>
          </section>

          <section className="card hover-lift">
            <div className="form-label">This month</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>₹{monthlyComparison.current}</div>
            <div style={{ marginTop: 8, fontSize: 13, color: monthlyComparison.change >= 0 ? '#dc2626' : '#16a34a' }}>
              {monthlyComparison.change === 0 ? 'No change vs last month' : `${monthlyComparison.change > 0 ? '↑' : '↓'} ${Math.abs(monthlyComparison.change)}% vs last month`}
            </div>

            {settings.monthlyBudget > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Budget: ₹{settings.monthlyBudget}</div>
                <div style={{ height: 10, background: '#e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.round((monthlyComparison.current / settings.monthlyBudget) * 100))}%`, height: '100%', background: monthlyComparison.current > settings.monthlyBudget ? '#dc2626' : '#16a34a', transition: 'width 300ms ease' }} />
                </div>
                <div style={{ marginTop: 6, fontSize: 12 }}>{Math.round((monthlyComparison.current / settings.monthlyBudget) * 100) || 0}% used</div>
              </div>
            )}
          </section>
        </div>

        {/* MIDDLE – Top categories */}
        <div className="space-y-4">
          <section className="card hover-lift">
            <strong>Top categories</strong>
            <div style={{ marginTop: 12 }}>
              {topCategories.length === 0 ? (
                <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>No categories yet</p>
              ) : (
                topCategories.map((t) => (
                  <div key={t.category} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 13 }}>{t.category}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>₹{t.value}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="card hover-lift">
            <strong>Insight</strong>
            <div style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>
              {monthlyComparison.current === 0 ? (
                'No spending this month yet — add an expense to get insights.'
              ) : (
                monthlyComparison.change > 0 ? 'You are spending more than last month — consider reviewing your top categories.' : 'Good job — you are spending less than last month.'
              )}
            </div>
          </section>
        </div>

        {/* RIGHT – Recent transactions */}
        <div className="space-y-4">
          <section className="card hover-lift">
            <strong>Recent transactions</strong>
            <div style={{ marginTop: 12 }}>
              {filteredExpenses.slice(0, 5).length === 0 ? (
                <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>No recent expenses</p>
              ) : (
                filteredExpenses.slice(0, 5).map(e => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>{e.category}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{e.note ?? ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div>₹{e.amount}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{e.date}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
