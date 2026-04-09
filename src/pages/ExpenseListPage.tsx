import { useExpenses } from "../hooks/useExpenses";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { doc, getDoc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import BulkActionBar from "../components/BulkActionBar";
import { db } from "../firebase";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Modal from "../components/common/Modal";
import ExpenseForm from "../components/ExpenseForm";
import { getMonthlySummary } from "../utils/monthSummary";
import { groupExpensesByDay } from "../utils/dayGrouping";
import { toast } from "react-toastify";
import { exportExpensesToCSV } from "../utils/exportCsv";
import useSettings from "../hooks/useSettings";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { useModals } from "../hooks/useModals";
import { Filter, X, ChevronDown, ChevronUp, Search, CheckCircle2 } from "lucide-react";
import { CATEGORIES } from "../types/expense";
import { Skeleton } from "../components/common/Skeleton";

export default function ExpenseListPage() {
  const { settings } = useSettings();
  const { expenses, loading } = useExpenses();
  const { accounts } = useAccounts();
  const { globalMonth } = useModals();

  const { categories: userCategories } = useCategories();
  const { accountTypes } = useAccountTypes();

  const months = useMemo(
    () => [...new Set(expenses.map((e) => e.month))].sort().reverse(),
    [expenses]
  );

  const selectedMonth = globalMonth ?? months[0] ?? "";
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedAccountTypeId, setSelectedAccountTypeId] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => e.month === selectedMonth),
    [expenses, selectedMonth]
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
    
    return filteredExpenses.filter((expense) => {
      // 1. Search Query Filter
      if (normalizedQuery) {
        const note = (expense.note ?? "").toLowerCase();
        const category = (expense.category ?? "").toLowerCase();
        const amount = String(expense.amount);
        const matchesSearch = note.includes(normalizedQuery) ||
                category.includes(normalizedQuery) ||
                amount.includes(normalizedQuery);
        if (!matchesSearch) return false;
      }

      // 2. Category Filter
      if (selectedCategory && expense.category !== selectedCategory) {
        return false;
      }

      // 3. Account Filter
      if (selectedAccountId && expense.accountId !== selectedAccountId) {
        return false;
      }

      // 4. Account Type Filter
      if (selectedAccountTypeId) {
        const account = accounts.find(a => a.id === expense.accountId);
        if (!account || account.typeId !== selectedAccountTypeId) {
          return false;
        }
      }

      return true;
    });
  }, [filteredExpenses, debouncedQuery, selectedCategory, selectedAccountId, selectedAccountTypeId, accounts]);

  const summary = useMemo(
    () => getMonthlySummary(searchedExpenses),
    [searchedExpenses]
  );

  const hasActiveFilters = selectedCategory || selectedAccountId || selectedAccountTypeId;

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedAccountId("");
    setSelectedAccountTypeId("");
    setQuery("");
  };

  const { today, yesterday, earlier } = useMemo(
    () => groupExpensesByDay(searchedExpenses, settings.timezone),
    [searchedExpenses, settings.timezone]
  );

  const navigate = useNavigate();
  const { user } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      
      if (next.size === 0) setIsSelectionMode(false);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    if (!user || selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) return;

    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, "users", user.uid, "expenses", id));
      });
      await batch.commit();
      toast.success(`Deleted ${selectedIds.size} expenses`);
      clearSelection();
    } catch (err) {
      console.error(err);
      toast.error("Bulk delete failed");
    }
  };

  const handleBulkCategorize = async (category: string) => {
    if (!user || selectedIds.size === 0) return;

    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.update(doc(db, "users", user.uid, "expenses", id), { category });
      });
      await batch.commit();
      toast.success(`Updated ${selectedIds.size} items to ${category}`);
      clearSelection();
    } catch (err) {
      console.error(err);
      toast.error("Bulk update failed");
    }
  };

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
      className="mx-auto max-w-3xl space-y-6 px-4 pb-32 pt-24"
    >

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Monthly Summary
            </h3>
            {hasActiveFilters && (
              <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">
                Filtered
              </span>
            )}
          </div>

          <div className="mb-4 text-2xl font-extrabold text-slate-900 dark:text-slate-50">
            {loading ? <Skeleton className="h-8 w-24" /> : `₹${summary.total.toLocaleString()}`}
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : searchedExpenses.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                No data matching your selection
              </p>
            ) : (
              <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
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
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/60 bg-white/80 p-3 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2.5 text-sm font-medium text-slate-800 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-all active:scale-95",
                  showFilters || hasActiveFilters
                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300"
                )}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilters && (
                  <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] text-blue-600 dark:bg-blue-100">
                    !
                  </span>
                )}
              </button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                      >
                        <option value="">All Categories</option>
                        {userCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>

                      <select
                        value={selectedAccountTypeId}
                        onChange={(e) => setSelectedAccountTypeId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                      >
                        <option value="">All Types</option>
                        {accountTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>

                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    >
                      <option value="">All Accounts</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>

                    <button
                      onClick={clearFilters}
                      className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors py-1"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between rounded-3xl border border-white/60 bg-white/80 p-3 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
            <span className="pl-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              Data
            </span>
            <button
              disabled={!searchedExpenses.length}
              onClick={() =>
                exportExpensesToCSV(searchedExpenses, `expenses-filtered.csv`)
              }
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-all active:scale-95 hover:bg-slate-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <span>Export Filtered</span>
              <span className="opacity-70">↓</span>
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-[400px] overflow-hidden rounded-3xl border border-white/40 bg-white/60 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/80">
        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <Skeleton className="h-12 w-12 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="h-5 w-16 ml-auto" />
                  <Skeleton className="h-3 w-12 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : searchedExpenses.length === 0 ? (
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
                      setEditingExpense={setEditingExpense}
                      accounts={accounts}
                      isSelected={expense.id ? selectedIds.has(expense.id) : false}
                      isSelectionMode={isSelectionMode}
                      onSelect={() => expense.id && toggleSelection(expense.id)}
                      onLongPress={() => {
                        if (expense.id) {
                          setIsSelectionMode(true);
                          toggleSelection(expense.id);
                        }
                      }}
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
                      setEditingExpense={setEditingExpense}
                      accounts={accounts}
                      isSelected={expense.id ? selectedIds.has(expense.id) : false}
                      isSelectionMode={isSelectionMode}
                      onSelect={() => expense.id && toggleSelection(expense.id)}
                      onLongPress={() => {
                        if (expense.id) {
                          setIsSelectionMode(true);
                          toggleSelection(expense.id);
                        }
                      }}
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
                      setEditingExpense={setEditingExpense}
                      accounts={accounts}
                      isSelected={expense.id ? selectedIds.has(expense.id) : false}
                      isSelectionMode={isSelectionMode}
                      onSelect={() => expense.id && toggleSelection(expense.id)}
                      onLongPress={() => {
                        if (expense.id) {
                          setIsSelectionMode(true);
                          toggleSelection(expense.id);
                        }
                      }}
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

      <Modal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        title="Edit Expense"
      >
        <ExpenseForm 
          editingExpense={editingExpense} 
          onSuccess={() => setEditingExpense(null)} 
        />
      </Modal>

      <AnimatePresence>
        {isSelectionMode && (
          <BulkActionBar 
            selectedCount={selectedIds.size}
            onClear={clearSelection}
            onDelete={handleBulkDelete}
            onCategorize={handleBulkCategorize}
            userCategories={userCategories}
          />
        )}
      </AnimatePresence>
    </motion.main>
  );
}

function ExpenseRow({ 
  expense, 
  currentMonth, 
  settings, 
  navigate, 
  setDeleteTarget, 
  setEditingExpense, 
  accounts,
  isSelected,
  isSelectionMode,
  onSelect,
  onLongPress
}: any) {
  const isLocked = settings.lockPastMonths && expense.month !== currentMonth;
  const account = accounts.find((item: any) => item.id === expense.accountId);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0, scale: isSelected ? 0.98 : 1 }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-blue-100 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/95 dark:hover:border-blue-900/70",
        isLocked && "cursor-not-allowed opacity-60 grayscale-[0.5] hover:border-slate-100 hover:shadow-sm dark:hover:border-slate-800",
        isSelected && "border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-500/10 shadow-lg shadow-blue-500/10"
      )}
      onClick={() => {
        if (isSelectionMode) {
          onSelect();
        } else if (!isLocked) {
          setEditingExpense(expense);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress();
      }}
      role={!isLocked ? "button" : undefined}
      tabIndex={!isLocked ? 0 : -1}
      onKeyDown={(event) => {
        if (!isLocked && (event.key === "Enter" || event.key === " ")) {
          if (isSelectionMode) onSelect();
          else setEditingExpense(expense);
        }
      }}
    >
      <div className="z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between relative">
        {/* Selection Indicator */}
        <div className={cn(
          "absolute -left-6 top-1/2 -translate-y-1/2 transition-all duration-300",
          isSelectionMode ? "left-0 opacity-100" : "-left-6 opacity-0"
        )}>
          <div className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
            isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 dark:border-slate-600"
          )}>
            {isSelected && <CheckCircle2 size={12} />}
          </div>
        </div>

        <div className={cn("min-w-0 flex-1 transition-all duration-300", isSelectionMode && "pl-8")}>
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

          <div className={cn("flex shrink-0 items-center gap-2", (isLocked || isSelectionMode) && "hidden")}>
            <button
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900"
              onClick={(event) => {
                event.stopPropagation();
                if (!isLocked) {
                  setEditingExpense(expense);
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
