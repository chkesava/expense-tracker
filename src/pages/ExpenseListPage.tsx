import { useExpenses } from "../hooks/useExpenses";
import { useAccounts } from "../hooks/useAccounts";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import MonthSelector from "../components/MonthSelector";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { getMonthlySummary } from "../utils/monthSummary";
import { groupExpensesByDay } from "../utils/dayGrouping";
import { toast } from "react-toastify";
import { exportExpensesToCSV } from "../utils/exportCsv";
import useSettings from "../hooks/useSettings";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";

export default function ExpenseListPage() {
  const { settings } = useSettings();
  const expenses = useExpenses();
  const { accounts } = useAccounts();

  const months = useMemo(
    () => [...new Set(expenses.map((e) => e.month))].sort().reverse(),
    [expenses]
  );

  const [userSelectedMonth, setUserSelectedMonth] = useState<string | null>(null);
  const selectedMonth = userSelectedMonth ?? months[0] ?? "";
  const currentMonth = new Date().toISOString().slice(0, 7);

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => e.month === selectedMonth),
    [expenses, selectedMonth]
  );

  const summary = useMemo(
    () => getMonthlySummary(filteredExpenses),
    [filteredExpenses]
  );

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const isSearching = query !== debouncedQuery;

  const searchedExpenses = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return filteredExpenses;
    }

    return filteredExpenses.filter((expense) => {
      const note = (expense.note ?? "").toLowerCase();
      const category = (expense.category ?? "").toLowerCase();
      const amount = String(expense.amount);

      return (
        note.includes(normalizedQuery) ||
        category.includes(normalizedQuery) ||
        amount.includes(normalizedQuery)
      );
    });
  }, [filteredExpenses, debouncedQuery]);

  const { today, yesterday, earlier } = useMemo(
    () => groupExpensesByDay(searchedExpenses, settings.timezone),
    [searchedExpenses, settings.timezone]
  );

  const navigate = useNavigate();
  const { user } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const doDelete = async (id?: string) => {
    if (!user || !id) {
      return;
    }

    try {
      const expenseRef = doc(db, "users", user.uid, "expenses", id);
      const snapshot = await getDoc(expenseRef);

      if (!snapshot.exists()) {
        setDeleteTarget(null);
        toast.error("Expense already removed");
        return;
      }

      const data = snapshot.data();

      if (data.month && data.month !== currentMonth) {
        setDeleteTarget(null);
        toast.error("Cannot delete expense from a past month");
        return;
      }

      await deleteDoc(expenseRef);
      setDeleteTarget(null);

      const toastId = toast(
        () => (
          <div className="flex items-center gap-3">
            <div>Expense deleted</div>
            <button
              className="rounded-md bg-slate-700 px-2 py-1 text-xs text-white transition-colors hover:bg-slate-800"
              onClick={async () => {
                try {
                  await setDoc(doc(db, "users", user.uid, "expenses", id), data);
                  toast.dismiss(toastId);
                  toast.success("Expense restored");
                } catch (error) {
                  console.error(error);
                  toast.error("Failed to restore expense");
                }
              }}
            >
              Undo
            </button>
          </div>
        ),
        { autoClose: 5000 }
      );
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message ?? "Failed to delete expense");
      setDeleteTarget(null);
    }
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-3xl space-y-6 px-4 pb-20 pt-24"
    >
      <MonthSelector
        months={months}
        value={selectedMonth}
        onChange={setUserSelectedMonth}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Monthly Summary
          </h3>

          <p className="mb-4 text-2xl font-extrabold text-slate-900 dark:text-slate-50">
            ₹{summary.total.toLocaleString()}
          </p>

          {filteredExpenses.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              No expenses for this month
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(summary.byCategory).map(([category, amount]) => (
                <div key={category} className="flex justify-between text-sm">
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {category}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    ₹{amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
            <input
              type="text"
              placeholder="Search expenses..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 font-medium text-slate-800 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            {isSearching && (
              <div className="ml-1 mt-2 text-xs text-slate-400 dark:text-slate-500">
                Searching...
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-3xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
            <span className="pl-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              Actions
            </span>
            <button
              disabled={!filteredExpenses.length}
              onClick={() =>
                exportExpensesToCSV(filteredExpenses, `expenses-${selectedMonth}.csv`)
              }
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-md shadow-slate-900/10 transition-all active:scale-95 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <span>Download CSV</span>
              <span className="opacity-70">↓</span>
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-[400px] overflow-hidden rounded-3xl border border-white/40 bg-white/60 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/80">
        {searchedExpenses.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <div className="mb-2 text-4xl">🔍</div>
            <p className="text-sm font-medium">No expenses found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {today.length > 0 && (
              <div className="bg-slate-50/50 p-4 dark:bg-slate-950/40">
                <h4 className="mb-3 ml-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Today
                </h4>
                <div className="space-y-2">
                  {today.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      currentMonth={currentMonth}
                      settings={settings}
                      navigate={navigate}
                      setDeleteTarget={setDeleteTarget}
                      accounts={accounts}
                    />
                  ))}
                </div>
              </div>
            )}

            {yesterday.length > 0 && (
              <div className="p-4">
                <h4 className="mb-3 ml-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Yesterday
                </h4>
                <div className="space-y-2">
                  {yesterday.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      currentMonth={currentMonth}
                      settings={settings}
                      navigate={navigate}
                      setDeleteTarget={setDeleteTarget}
                      accounts={accounts}
                    />
                  ))}
                </div>
              </div>
            )}

            {earlier.length > 0 && (
              <div className="bg-slate-50/30 p-4 dark:bg-slate-950/30">
                <h4 className="mb-3 ml-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Earlier
                </h4>
                <div className="space-y-2">
                  {earlier.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      currentMonth={currentMonth}
                      settings={settings}
                      navigate={navigate}
                      setDeleteTarget={setDeleteTarget}
                      accounts={accounts}
                    />
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

function ExpenseRow({ expense, currentMonth, settings, navigate, setDeleteTarget, accounts }: any) {
  const isLocked = settings.lockPastMonths && expense.month !== currentMonth;
  const account = accounts.find((item: any) => item.id === expense.accountId);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-blue-100 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/95 dark:hover:border-blue-900/70",
        isLocked && "cursor-not-allowed opacity-60 grayscale-[0.5] hover:border-slate-100 hover:shadow-sm dark:hover:border-slate-800"
      )}
      onClick={() => {
        if (!isLocked) {
          navigate("/add", { state: expense });
        }
      }}
      role={!isLocked ? "button" : undefined}
      tabIndex={!isLocked ? 0 : -1}
      onKeyDown={(event) => {
        if (!isLocked && (event.key === "Enter" || event.key === " ")) {
          navigate("/add", { state: expense });
        }
      }}
    >
      <div className="z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {expense.category}
            </span>
            {isLocked && (
              <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Locked
              </span>
            )}
          </div>

          {account && (
            <span className="mt-2 inline-flex max-w-full items-center rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-bold leading-tight text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300">
              {account.name}
            </span>
          )}

          {expense.note && (
            <div className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
              {expense.note}
            </div>
          )}

          <span className="mt-2 block text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            {expense.date}
            {expense.time ? ` • ${expense.time}` : ""}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end sm:justify-center">
          <div className="whitespace-nowrap text-base font-bold text-slate-900 dark:text-slate-50">
            -₹{expense.amount}
          </div>

          <div className={cn("flex shrink-0 items-center gap-2", isLocked && "hidden")}>
            <button
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900"
              onClick={(event) => {
                event.stopPropagation();
                if (!isLocked) {
                  navigate("/add", { state: expense });
                }
              }}
            >
              Edit
            </button>
            <button
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:border-red-300 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:border-red-800 dark:hover:bg-red-950/50"
              onClick={(event) => {
                event.stopPropagation();
                if (!isLocked) {
                  setDeleteTarget(expense.id ?? null);
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
