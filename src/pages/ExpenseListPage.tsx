import { useExpenses } from "../hooks/useExpenses";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import MonthSelector from "../components/MonthSelector";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { getMonthlySummary } from "../utils/monthSummary";
import { groupExpensesByDay } from "../utils/dayGrouping";
import { toast } from 'react-toastify';
import { exportExpensesToCSV } from "../utils/exportCsv";
import useSettings from "../hooks/useSettings";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

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
        <div className="flex items-center gap-3">
          <div>Expense deleted</div>
          <button
            type="button"
            className="px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:opacity-90 transition-opacity"
            onClick={async () => {
              try {
                // Restore with original ID to preserve consistency
                await setDoc(doc(db, "users", user.uid, "expenses", id), data);
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
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="max-w-2xl mx-auto pt-20 md:pt-24 pb-28 px-4 space-y-6 bg-page-gradient min-h-screen"
    >
      <MonthSelector months={months} value={selectedMonth} onChange={setUserSelectedMonth} />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="bg-card-gradient border border-border rounded-xl p-5 shadow-card">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">This month</h3>
          <p className="text-2xl font-semibold text-foreground mb-4">₹{summary.total.toLocaleString()}</p>
          {filteredExpenses.length === 0 ? (
            <p className="text-xs text-muted-foreground">No expenses this month</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(summary.byCategory).map(([cat, amt]) => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{cat}</span>
                  <span className="font-medium text-foreground">₹{amt.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-4">
          <div className="bg-card-gradient border border-border rounded-xl p-4 shadow-card">
            <input
              type="text"
              placeholder="Search expenses..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
            />
            {isSearching && <p className="text-xs text-muted-foreground mt-2">Searching…</p>}
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-card">
            <span className="text-sm font-medium text-muted-foreground">Export</span>
            <button
              type="button"
              disabled={!filteredExpenses.length}
              onClick={() => exportExpensesToCSV(filteredExpenses, `expenses-${selectedMonth}.csv`)}
              className="px-4 py-2 bg-gradient-primary text-primary-foreground text-sm font-medium rounded-xl shadow-glow hover:shadow-glow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Download CSV
            </button>
          </div>
        </div>
      </div>

      <section className="bg-card-gradient border border-border rounded-xl overflow-hidden shadow-card min-h-[320px]">
        {searchedExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm font-medium">No expenses found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {today.length > 0 && (
              <div className="p-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Today</h4>
                <div className="space-y-2">
                  {today.map((e) => (
                    <ExpenseRow key={e.id} expense={e} currentMonth={currentMonth} settings={settings} navigate={navigate} setDeleteTarget={setDeleteTarget} />
                  ))}
                </div>
              </div>
            )}
            {yesterday.length > 0 && (
              <div className="p-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Yesterday</h4>
                <div className="space-y-2">
                  {yesterday.map((e) => (
                    <ExpenseRow key={e.id} expense={e} currentMonth={currentMonth} settings={settings} navigate={navigate} setDeleteTarget={setDeleteTarget} />
                  ))}
                </div>
              </div>
            )}
            {earlier.length > 0 && (
              <div className="p-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Earlier</h4>
                <div className="space-y-2">
                  {earlier.map((e) => (
                    <ExpenseRow key={e.id} expense={e} currentMonth={currentMonth} settings={settings} navigate={navigate} setDeleteTarget={setDeleteTarget} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete expense"
        message="Do you want to delete this expense? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => doDelete(deleteTarget ?? undefined)}
      />
    </motion.main>
  );
}

function ExpenseRow({
  expense: e,
  currentMonth,
  settings,
  navigate,
  setDeleteTarget,
}: {
  expense: { id?: string; category: string; note?: string; date: string; time?: string; amount: number; month?: string };
  currentMonth: string;
  settings: { lockPastMonths?: boolean };
  navigate: (path: string, opts?: { state: unknown }) => void;
  setDeleteTarget: (id: string | null) => void;
}) {
  const isLocked = settings.lockPastMonths && e.month !== currentMonth;

  return (
    <div
      role={!isLocked ? "button" : undefined}
      tabIndex={!isLocked ? 0 : -1}
      onClick={() => { if (!isLocked) navigate("/add", { state: e }); }}
      onKeyDown={(ev) => { if (!isLocked && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); navigate("/add", { state: e }); } }}
      className={cn(
        "flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors",
        isLocked && "opacity-60 cursor-not-allowed hover:bg-card"
      )}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{e.category}</span>
          {isLocked && <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">Locked</span>}
        </div>
        {e.note && <span className="text-xs text-muted-foreground truncate">{e.note}</span>}
        <span className="text-[11px] text-muted-foreground">{e.date}{e.time ? ` · ${e.time}` : ""}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-medium text-foreground">−₹{e.amount.toLocaleString()}</span>
        {!isLocked && (
          <>
            <button
              type="button"
              className="small-btn"
              onClick={(ev) => { ev.stopPropagation(); navigate("/add", { state: e }); }}
            >
              Edit
            </button>
            <button
              type="button"
              className="small-btn danger-btn"
              onClick={(ev) => { ev.stopPropagation(); setDeleteTarget(e.id ?? null); }}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
