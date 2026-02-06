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
            className="px-2 py-1 bg-slate-700 text-white text-xs rounded-md hover:bg-slate-800 transition-colors"
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
      className="max-w-3xl mx-auto pt-24 pb-20 px-4 space-y-6"
    >
      <MonthSelector
        months={months}
        value={selectedMonth}
        onChange={setUserSelectedMonth}
      />

      {/* Monthly summary & Search & Export */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Monthly Summary</h3>

          <p className="text-2xl font-extrabold text-slate-900 mb-4">
            ₹{summary.total.toLocaleString()}
          </p>

          {filteredExpenses.length === 0 ? (
            <p className="text-xs text-slate-400">
              No expenses for this month
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(summary.byCategory).map(([cat, amt]) => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">{cat}</span>
                  <span className="font-bold text-slate-800">₹{amt.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-4 rounded-3xl shadow-sm">
            <input
              type="text"
              placeholder="Search expenses..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
            />
            {isSearching && (
              <div className="text-xs text-slate-400 mt-2 ml-1">Searching...</div>
            )}
          </div>

          <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-4 rounded-3xl shadow-sm flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600 pl-2">Actions</span>
            <button
              disabled={!filteredExpenses.length}
              onClick={() => exportExpensesToCSV(filteredExpenses, `expenses-${selectedMonth}.csv`)}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md shadow-slate-900/10 flex items-center gap-2"
            >
              <span>Download CSV</span>
              <span className="opacity-70">⬇️</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable expense list (grouped by day) */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl shadow-sm overflow-hidden min-h-[400px]">
        {searchedExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-sm font-medium">No expenses found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {today.length > 0 && (
              <div className="p-4 bg-slate-50/50">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-2">Today</h4>
                <div className="space-y-2">
                  {today.map((e) => (
                    <ExpenseRow key={e.id} expense={e} currentMonth={currentMonth} settings={settings} navigate={navigate} setDeleteTarget={setDeleteTarget} />
                  ))}
                </div>
              </div>
            )}

            {yesterday.length > 0 && (
              <div className="p-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-2">Yesterday</h4>
                <div className="space-y-2">
                  {yesterday.map((e) => (
                    <ExpenseRow key={e.id} expense={e} currentMonth={currentMonth} settings={settings} navigate={navigate} setDeleteTarget={setDeleteTarget} />
                  ))}
                </div>
              </div>
            )}

            {earlier.length > 0 && (
              <div className="p-4 bg-slate-50/30">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-2">Earlier</h4>
                <div className="space-y-2">
                  {earlier.map((e) => (
                    <ExpenseRow key={e.id} expense={e} currentMonth={currentMonth} settings={settings} navigate={navigate} setDeleteTarget={setDeleteTarget} />
                  ))}
                </div>
              </div>
            )}
          </div>
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
    </motion.main>
  );
}

// Extracted ExpenseRow for cleaner code
function ExpenseRow({ expense: e, currentMonth, settings, navigate, setDeleteTarget }: any) {
  const isLocked = settings.lockPastMonths && e.month !== currentMonth;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "group relative flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-blue-100 cursor-pointer overflow-hidden",
        isLocked && "opacity-60 grayscale-[0.5] cursor-not-allowed hover:shadow-sm hover:border-slate-100"
      )}
      onClick={() => { if (!isLocked) navigate("/add", { state: e }); }}
      role={!isLocked ? "button" : undefined}
      tabIndex={!isLocked ? 0 : -1}
      onKeyDown={(ev) => { if (!isLocked && (ev.key === "Enter" || ev.key === " ")) navigate("/add", { state: e }); }}
    >
      <div className="flex flex-col gap-1 z-10">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">{e.category}</span>
          {isLocked && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">Locked</span>}
        </div>

        {e.note && <span className="text-xs text-slate-500 line-clamp-1">{e.note}</span>}

        <span className="text-[10px] font-semibold text-slate-400">
          {e.date} {e.time && `• ${e.time}`}
        </span>
      </div>

      <div className="flex items-center gap-4 z-10">
        <div className="text-base font-bold text-slate-900">-₹{e.amount}</div>

        {/* Actions - visible always */}
        <div className={cn("flex items-center gap-2", isLocked && "hidden")}>
          <button
            className="small-btn"
            onClick={(ev) => { ev.stopPropagation(); if (!isLocked) navigate("/add", { state: e }); }}
          >
            Edit
          </button>
          <button
            className="small-btn danger-btn"
            onClick={(ev) => { ev.stopPropagation(); if (!isLocked) setDeleteTarget(e.id ?? null); }}
          >
            Delete
          </button>
        </div>
      </div>
    </motion.div>
  );
}
