import { useExpenses } from "../hooks/useExpenses";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { deleteDoc, doc, getDoc, addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import MonthSelector from "../components/MonthSelector";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { getMonthlySummary } from "../utils/monthSummary";
import { groupExpensesByDay } from "../utils/dayGrouping";
import { toast } from 'react-toastify';
import { exportExpensesToCSV } from "../utils/exportCsv";
import useSettings from "../hooks/useSettings";

export default function ExpenseListPage() {
  const { settings } = useSettings();
  const expenses = useExpenses();

  const months = useMemo(
    () => [...new Set(expenses.map(e => e.month))].sort().reverse(),
    [expenses]
  );

  const [userSelectedMonth, setUserSelectedMonth] = useState<string | null>(null);
  const selectedMonth = userSelectedMonth ?? months[0] ?? "";

  // current month (YYYY-MM) used for locking past months
  const currentMonth = new Date().toISOString().slice(0, 7);

  const filteredExpenses = useMemo(
    () => expenses.filter(e => e.month === selectedMonth),
    [expenses, selectedMonth]
  );

  const summary = useMemo(
    () => getMonthlySummary(filteredExpenses),
    [filteredExpenses]
  );

  // search state (debounced so we only run search after the user stops typing)
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const isSearching = query !== debouncedQuery;

  // apply search on month-filtered expenses using debouncedQuery
  const searchedExpenses = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return filteredExpenses;

    return filteredExpenses.filter((e) => {
      const note = (e.note ?? "").toLowerCase();
      const category = (e.category ?? "").toLowerCase();
      const amount = String(e.amount);
      return (
        note.includes(q) ||
        category.includes(q) ||
        amount.includes(q)
      );
    });
  }, [filteredExpenses, debouncedQuery]);

  // group searched expenses by day, respecting user timezone
  const { today, yesterday, earlier } = useMemo(() => {
    return groupExpensesByDay(searchedExpenses, settings.timezone);
  }, [searchedExpenses, settings.timezone]);

  const navigate = useNavigate();
  const { user } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // user settings (controls whether past months are editable)

  const doDelete = async (id?: string) => {
    if (!user || !id) return;
    try {
      const dRef = doc(db, "users", user.uid, "expenses", id);
      const snap = await getDoc(dRef);
      if (!snap.exists()) {
        setDeleteTarget(null);
        toast.error("Expense already removed");
        return;
      }

      const data = snap.data();

      // prevent deletion of past-month expenses as a safety guard
      if (data.month && data.month !== currentMonth) {
        setDeleteTarget(null);
        toast.error("Cannot delete expense from a past month");
        return;
      }

      await deleteDoc(dRef);
      setDeleteTarget(null);

      const toastId = toast(() => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>Expense deleted</div>
          <button
            className="small-btn muted-btn"
            onClick={async () => {
              try {
                await addDoc(collection(db, "users", user.uid, "expenses"), data as Record<string, unknown>);
                toast.dismiss(toastId);
                toast.success("Expense restored");
              } catch (err) {
                console.error(err);
                toast.error("Failed to restore expense");
              }
            }}
          >
            Undo
          </button>
        </div>
      ), { autoClose: 5000 });

    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg ?? "Failed to delete expense");
      setDeleteTarget(null);
    }
  };

  return (
    <>


      <main className="app-container page-enter">
        {/* Month selector */}
        <MonthSelector
          months={months}
          value={selectedMonth}
          onChange={setUserSelectedMonth}
        />

        {/* Monthly summary */}
        <div className="card">
          <h3 className="form-title">Monthly Summary</h3>

          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            Total Spent: ₹{summary.total}
          </p>

          {filteredExpenses.length === 0 ? (
            <p style={{ fontSize: 12, color: "#6b7280" }}>
              No expenses for this month
            </p>
          ) : (
            Object.entries(summary.byCategory).map(([cat, amt]) => (
              <div
                key={cat}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  marginTop: 6,
                }}
              >
                <span>{cat}</span>
                <span>₹{amt}</span>
              </div>
            ))
          )}
        </div>

        {/* Search */}
        <div className="card">
          <input
            type="text"
            placeholder="Search expenses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              fontSize: 14,
            }}
          />
          {isSearching && (
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>Searching...</div>
          )}
        </div>

        {/* Export CSV (current month) */}
        <div className="card" style={{ display: "flex", gap: 8 }}>
          <button
            className="primary-btn"
            disabled={!filteredExpenses.length}
            onClick={() => exportExpensesToCSV(filteredExpenses, `expenses-${selectedMonth}.csv`)}
          >
            ⬇️ Export CSV
          </button>
        </div>

        {/* Scrollable expense list (grouped by day) */}
        <div className="card scroll-card">
          {searchedExpenses.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              No expenses found
            </p>
          ) : (
            <>
              {today.length > 0 && (
                <>
                  <h4 className="list-section-title">Today</h4>
                  {today.map((e) => {
                    const isLocked = settings.lockPastMonths && e.month !== currentMonth;
                    return (
                      <div
                        key={e.id}
                        className="expense-row"
                        role={!isLocked ? "button" : undefined}
                        tabIndex={!isLocked ? 0 : -1}
                        onClick={() => { if (!isLocked) navigate("/add", { state: e }); }}
                        onKeyDown={(ev) => { if (!isLocked && (ev.key === "Enter" || ev.key === " ")) navigate("/add", { state: e }); }}
                        aria-disabled={isLocked}
                      >
                        <div className="expense-left">
                          <span className="expense-category">{e.category}</span>
                          {isLocked && (
                            <span
                              title="This expense is locked (past month)"
                              role="img"
                              aria-label="Locked expense - past month"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9ca3af', marginLeft: 8 }}
                            >
                              <span aria-hidden="true">🔒</span>
                              <span>Locked</span>
                            </span>
                          )}
                          {e.note && <span className="expense-note">{e.note}</span>}
                          <span className="expense-date">
                            {e.date}
                            {e.time && ` • ${e.time}`}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            className="small-btn muted-btn"
                            onClick={(ev) => { ev.stopPropagation(); if (!isLocked) navigate("/add", { state: e }); }}
                            disabled={isLocked}
                            aria-disabled={isLocked}
                            aria-label={isLocked ? 'Edit (locked)' : 'Edit expense'}
                            title={isLocked ? 'Cannot edit past-month expense' : 'Edit expense'}
                            style={{ opacity: isLocked ? 0.4 : 1, cursor: isLocked ? "not-allowed" : "pointer" }}
                          >
                            Edit
                          </button>

                          <div className="expense-amount">₹{e.amount}</div>

                          <button
                            className="small-btn danger-btn"
                            onClick={(ev) => { ev.stopPropagation(); if (!isLocked) setDeleteTarget(e.id ?? null); }}
                            disabled={isLocked}
                            aria-disabled={isLocked}
                            aria-label={isLocked ? 'Delete (locked)' : 'Delete expense'}
                            title={isLocked ? 'Cannot delete past-month expense' : 'Delete expense'}
                            style={{ opacity: isLocked ? 0.4 : 1, cursor: isLocked ? "not-allowed" : "pointer" }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {yesterday.length > 0 && (
                <>
                  <h4 className="list-section-title">Yesterday</h4>
                  {yesterday.map((e) => {
                    const isLocked = settings.lockPastMonths && e.month !== currentMonth;
                    return (
                      <div
                        key={e.id}
                        className="expense-row"
                        role={!isLocked ? "button" : undefined}
                        tabIndex={!isLocked ? 0 : -1}
                        onClick={() => { if (!isLocked) navigate("/add", { state: e }); }}
                        onKeyDown={(ev) => { if (!isLocked && (ev.key === "Enter" || ev.key === " ")) navigate("/add", { state: e }); }}
                        aria-disabled={isLocked}
                      >
                        <div className="expense-left">
                          <span className="expense-category">{e.category}</span>
                          {isLocked && (
                            <span
                              title="This expense is locked (past month)"
                              role="img"
                              aria-label="Locked expense - past month"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9ca3af', marginLeft: 8 }}
                            >
                              <span aria-hidden="true">🔒</span>
                              <span>Locked</span>
                            </span>
                          )}
                          {e.note && <span className="expense-note">{e.note}</span>}
                          <span className="expense-date">
                            {e.date}
                            {e.time && ` • ${e.time}`}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            className="small-btn muted-btn"
                            onClick={(ev) => { ev.stopPropagation(); if (!isLocked) navigate("/add", { state: e }); }}
                            disabled={isLocked}
                            aria-disabled={isLocked}
                            aria-label={isLocked ? 'Edit (locked)' : 'Edit expense'}
                            title={isLocked ? 'Cannot edit past-month expense' : 'Edit expense'}
                            style={{ opacity: isLocked ? 0.4 : 1, cursor: isLocked ? "not-allowed" : "pointer" }}
                          >
                            Edit
                          </button>

                          <div className="expense-amount">₹{e.amount}</div>

                          <button
                            className="small-btn danger-btn"
                            onClick={(ev) => { ev.stopPropagation(); if (!isLocked) setDeleteTarget(e.id ?? null); }}
                            disabled={isLocked}
                            aria-disabled={isLocked}
                            aria-label={isLocked ? 'Delete (locked)' : 'Delete expense'}
                            title={isLocked ? 'Cannot delete past-month expense' : 'Delete expense'}
                            style={{ opacity: isLocked ? 0.4 : 1, cursor: isLocked ? "not-allowed" : "pointer" }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {earlier.length > 0 && (
                <>
                  <h4 className="list-section-title">Earlier</h4>
                  {earlier.map((e) => {
                    const isLocked = settings.lockPastMonths && e.month !== currentMonth;
                    return (
                      <div
                        key={e.id}
                        className="expense-row"
                        role={!isLocked ? "button" : undefined}
                        tabIndex={!isLocked ? 0 : -1}
                        onClick={() => { if (!isLocked) navigate("/add", { state: e }); }}
                        onKeyDown={(ev) => { if (!isLocked && (ev.key === "Enter" || ev.key === " ")) navigate("/add", { state: e }); }}
                        aria-disabled={isLocked}
                      >
                        <div className="expense-left">
                          <span className="expense-category">{e.category}</span>
                          {isLocked && (
                            <span
                              title="This expense is locked (past month)"
                              role="img"
                              aria-label="Locked expense - past month"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9ca3af', marginLeft: 8 }}
                            >
                              <span aria-hidden="true">🔒</span>
                              <span>Locked</span>
                            </span>
                          )}
                          {e.note && <span className="expense-note">{e.note}</span>}
                          <span className="expense-date">
                            {e.date}
                            {e.time && ` • ${e.time}`}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            className="small-btn muted-btn"
                            onClick={(ev) => { ev.stopPropagation(); if (!isLocked) navigate("/add", { state: e }); }}
                            disabled={isLocked}
                            aria-disabled={isLocked}
                            aria-label={isLocked ? 'Edit (locked)' : 'Edit expense'}
                            title={isLocked ? 'Cannot edit past-month expense' : 'Edit expense'}
                            style={{ opacity: isLocked ? 0.4 : 1, cursor: isLocked ? "not-allowed" : "pointer" }}
                          >
                            Edit
                          </button>

                          <div className="expense-amount">₹{e.amount}</div>

                          <button
                            className="small-btn danger-btn"
                            onClick={(ev) => { ev.stopPropagation(); if (!isLocked) setDeleteTarget(e.id ?? null); }}
                            disabled={isLocked}
                            aria-disabled={isLocked}
                            aria-label={isLocked ? 'Delete (locked)' : 'Delete expense'}
                            title={isLocked ? 'Cannot delete past-month expense' : 'Delete expense'}
                            style={{ opacity: isLocked ? 0.4 : 1, cursor: isLocked ? "not-allowed" : "pointer" }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>

        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete expense"
          message="Do you want to delete this expense? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => doDelete(deleteTarget ?? undefined)}
        />
      </main>
    </>
  );
}
