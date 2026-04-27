import { useExpenses } from "../hooks/useExpenses";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useCategorizationRules } from "../hooks/useCategorizationRules";
import { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { doc, getDoc, setDoc, deleteDoc, writeBatch, addDoc, collection, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { useModals } from "../hooks/useModals";
import useSettings from "../hooks/useSettings";

import { 
  Filter, 
  Search, 
  CheckCircle2, 
  History, 
  Sparkles, 
  Database, 
  Download, 
  Upload,
  ArrowUpDown,
  X,
  Plus
} from "lucide-react";

import PageHeader from "../components/layout/PageHeader";
import BulkActionBar from "../components/BulkActionBar";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Modal from "../components/common/Modal";
import ExpenseForm from "../components/ExpenseForm";
import { Skeleton } from "../components/common/Skeleton";
import { CATEGORIES } from "../types/expense";
import { getMonthlySummary } from "../utils/monthSummary";
import { groupExpensesByDay } from "../utils/dayGrouping";
import { exportExpensesToCSV } from "../utils/exportCsv";

// Audit Components
import AuditCard from "../components/audit/AuditCard";
import AuditControls from "../components/audit/AuditControls";

type ExpensesTab = "history" | "audit" | "data";

export default function ExpenseListPage() {
  const { settings } = useSettings();
  const { expenses, loading } = useExpenses();
  const { accounts } = useAccounts();
  const { categories: userCategories } = useCategories();
  const { accountTypes } = useAccountTypes();
  const { rules } = useCategorizationRules();
  const { globalMonth } = useModals();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<ExpensesTab>(() => {
    if (location.state?.tab) return location.state.tab as ExpensesTab;
    return "history";
  });

  // --- HISTORY STATE ---
  const months = useMemo(() => [...new Set(expenses.map((e) => e.month))].sort().reverse(), [expenses]);
  const selectedMonth = globalMonth ?? months[0] ?? "";
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedAccountTypeId, setSelectedAccountTypeId] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // --- AUDIT STATE ---
  const [auditIndex, setAuditIndex] = useState(0);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // --- DATA STATE ---
  const [importRows, setImportRows] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [defaultImportAccountId, setDefaultImportAccountId] = useState("");

  // --- COMMON UI STATE ---
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // --- LOGIC: HISTORY ---
  const filteredByMonth = useMemo(() => expenses.filter(e => e.month === selectedMonth), [expenses, selectedMonth]);
  
  const searchedExpenses = useMemo(() => {
    let results = filteredByMonth.filter(e => {
        if (selectedCategory && e.category !== selectedCategory) return false;
        if (selectedAccountId && e.accountId !== selectedAccountId) return false;
        if (selectedAccountTypeId) {
            const acc = accounts.find(a => a.id === e.accountId);
            if (!acc || acc.typeId !== selectedAccountTypeId) return false;
        }
        if (query) {
            const q = query.toLowerCase();
            const matches = (e.note || "").toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || String(e.amount).includes(q);
            if (!matches) return false;
        }
        return true;
    });

    results.sort((a, b) => {
        if (sortField === "date") {
            const valA = a.date + (a.time || "");
            const valB = b.date + (b.time || "");
            return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
            return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount;
        }
    });

    return results;
  }, [filteredByMonth, query, selectedCategory, selectedAccountId, selectedAccountTypeId, accounts, sortField, sortOrder]);

  const historySummary = useMemo(() => getMonthlySummary(searchedExpenses), [searchedExpenses]);
  const { today, yesterday, earlier } = useMemo(() => groupExpensesByDay(searchedExpenses, settings.timezone), [searchedExpenses, settings.timezone]);

  // --- LOGIC: AUDIT ---
  const auditableExpenses = useMemo(() => {
    return expenses.filter(e => {
      const isUncategorized = !e.category || ["Other", "Uncategorized"].includes(e.category);
      const isMissingNote = !e.note || e.note.trim() === "" || e.note.toLowerCase().includes("no note");
      return (isUncategorized || isMissingNote) && !e.isAudited;
    });
  }, [expenses]);
  
  const currentAuditExpense = auditableExpenses[auditIndex];
  const auditTotal = auditableExpenses.length;
  const auditRemaining = auditTotal - auditIndex;

  const handleAuditAction = async (action: "keep" | "edit" | "categorize" | "update-category", data?: any) => {
    if (!user || !currentAuditExpense?.id) return;
    try {
        const ref = doc(db, "users", user.uid, "expenses", currentAuditExpense.id);
        if (action === "keep") {
            await updateDoc(ref, { isAudited: true, lastAuditedAt: serverTimestamp() });
            toast.success("Confirmed!");
        } else if (action === "update-category") {
            await updateDoc(ref, { category: data.category, isAudited: true });
            toast.success(`Set to ${data.category}`);
            setShowCategoryPicker(false);
        } else if (action === "categorize") {
            setShowCategoryPicker(true);
            return;
        } else if (action === "edit") {
            setEditingExpense(currentAuditExpense);
            return;
        }
        setAuditIndex(prev => prev + 1);
    } catch (err) {
        toast.error("Audit failed");
    }
  };

  // --- LOGIC: DATA ---
  const handleCsvFile = async (file: File) => {
    const text = await file.text();
    const rows = text.split("\n").filter(l => l.trim()).slice(1);
    const parsed = rows.map(line => {
        const parts = line.split(",").map(p => p.trim());
        return {
            amount: Number(parts[0]),
            date: parts[1],
            category: parts[2] || "Other",
            note: parts[3] || "",
            month: parts[1]?.slice(0, 7)
        };
    }).filter(r => r.amount > 0 && r.date);
    setImportRows(parsed);
    toast.info(`Loaded ${parsed.length} rows`);
  };

  const executeImport = async () => {
    if (!user || !importRows.length) return;
    setIsImporting(true);
    try {
        const batch = writeBatch(db);
        for (const row of importRows) {
            const ref = doc(collection(db, "users", user.uid, "expenses"));
            batch.set(ref, {
                ...row,
                accountId: defaultImportAccountId || accounts[0]?.id || "",
                createdAt: serverTimestamp(),
                time: "12:00"
            });
        }
        await batch.commit();
        toast.success(`Imported ${importRows.length} expenses`);
        setImportRows([]);
    } catch (err) {
        toast.error("Import failed");
    } finally {
        setIsImporting(false);
    }
  };

  // --- COMMON LOGIC ---
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setIsSelectionMode(false);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!user || !selectedIds.size) return;
    if (!window.confirm(`Delete ${selectedIds.size} items?`)) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => batch.delete(doc(db, "users", user.uid, "expenses", id)));
      await batch.commit();
      toast.success("Deleted!");
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } catch (err) { toast.error("Bulk delete failed"); }
  };

  const handleBulkCategorize = async (category: string) => {
    if (!user || !selectedIds.size) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => batch.update(doc(db, "users", user.uid, "expenses", id), { category }));
      await batch.commit();
      toast.success("Updated!");
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } catch (err) { toast.error("Bulk update failed"); }
  };

  // Render Section
  const tabs = [
    { id: "history", label: "History", icon: <History size={16} /> },
    { id: "audit", label: "Audit", icon: <Sparkles size={16} /> },
    { id: "data", label: "Data", icon: <Database size={16} /> },
  ];

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl px-4 pb-32 pt-24">
      <PageHeader 
        title="Expenses Hub" 
        subtitle="Manage, audit, and import your finance data."
        icon={<CheckCircle2 size={24} />}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
          
          {/* HISTORY TAB */}
          {activeTab === "history" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
                <div className="space-y-6">
                  {/* Summary & Filters */}
                  <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Monthly Pulse</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setSortField("date")} className={cn("text-[10px] font-bold px-2 py-1 rounded-lg", sortField === "date" ? "bg-slate-900 text-white" : "bg-slate-100 dark:bg-slate-800")}>Date</button>
                            <button onClick={() => setSortField("amount")} className={cn("text-[10px] font-bold px-2 py-1 rounded-lg", sortField === "amount" ? "bg-slate-900 text-white" : "bg-slate-100 dark:bg-slate-800")}>Amount</button>
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">₹{historySummary.total.toLocaleString()}</div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {Object.entries(historySummary.byCategory).slice(0, 5).map(([c, a]) => (
                            <div key={c} className="text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-500">
                                {c}: ₹{a.toLocaleString()}
                            </div>
                        ))}
                    </div>
                  </div>

                  {/* Expense Items */}
                  <div className="min-h-[400px] rounded-3xl border border-white/40 bg-white/50 backdrop-blur-md overflow-hidden">
                    {loading ? <Skeleton className="h-full w-full" /> : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                           {[...today, ...yesterday, ...earlier].length === 0 ? (
                               <div className="py-20 text-center text-slate-400 italic">No matches found</div>
                           ) : (
                               [...today, ...yesterday, ...earlier].map(e => (
                               <ExpenseRow 
                                    key={e.id} 
                                    expense={e} 
                                    accounts={accounts} 
                                    isSelected={selectedIds.has(e.id!)} 
                                    onSelect={() => toggleSelection(e.id!)}
                                    onEdit={() => setEditingExpense(e)}
                                    onDelete={() => setDeleteTarget(e.id!)}
                               />
                               ))
                           )}
                        </div>
                    )}
                  </div>
                </div>

                {/* Right Sidebar: Filters */}
                <aside className="space-y-4">
                    <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
                        <div className="relative mb-4">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                value={query} 
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search..."
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/20"
                            />
                        </div>
                        <div className="space-y-3">
                            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold">
                                <option value="">All Categories</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold">
                                <option value="">All Accounts</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            <button onClick={() => { setQuery(""); setSelectedCategory(""); setSelectedAccountId(""); }} className="w-full text-[10px] font-black uppercase text-slate-400 hover:text-blue-500 transition-colors">Clear filters</button>
                        </div>
                    </div>
                </aside>
              </div>
            </div>
          )}

          {/* AUDIT TAB */}
          {activeTab === "audit" && (
            <div className="flex flex-col items-center">
                <div className="w-full max-w-md mb-8 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 p-4 rounded-3xl border border-white/20">
                    <div className="text-left">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Audit Mode</h3>
                        <p className="text-xs font-bold">{auditRemaining} tasks left</p>
                    </div>
                    <div className="h-1.5 w-32 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(auditIndex/auditTotal)*100}%` }} className="h-full bg-blue-600" />
                    </div>
                </div>

                <div className="relative w-full max-w-md aspect-[3/4] mb-12">
                    {auditRemaining > 0 ? (
                        <AuditCard 
                            key={currentAuditExpense.id} 
                            expense={currentAuditExpense} 
                            onAction={handleAuditAction}
                            onSwipe={(dir) => {
                                if (dir === "right") handleAuditAction("keep");
                                if (dir === "up") handleAuditAction("categorize");
                                if (dir === "left") handleAuditAction("edit");
                            }}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/80 dark:bg-slate-900/80 rounded-[3rem] border-2 border-dashed border-slate-200">
                            <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
                            <h3 className="text-xl font-black">Laboratory Clean!</h3>
                            <p className="text-sm text-slate-500 mt-2 text-balance">All expenses have been categorized and confirmed.</p>
                        </div>
                    )}
                </div>

                {auditRemaining > 0 && <AuditControls onAction={handleAuditAction as any} />}
            </div>
          )}

          {/* DATA TAB */}
          {activeTab === "data" && (
            <div className="space-y-6">
                <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Import / Export Hub</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <Upload className="text-blue-500" />
                                <span className="text-sm font-bold">Upload CSV</span>
                                <input type="file" className="hidden" accept=".csv" onChange={e => e.target.files?.[0] && handleCsvFile(e.target.files[0])} />
                            </label>
                            
                            <select 
                                value={defaultImportAccountId} 
                                onChange={e => setDefaultImportAccountId(e.target.value)}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-3 text-sm font-bold"
                            >
                                <option value="">Default Import Account</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-4">
                             <button 
                                onClick={() => exportExpensesToCSV(expenses, "backup.csv")}
                                className="flex w-full items-center justify-between p-6 rounded-3xl bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                            >
                                <div className="text-left">
                                    <h4 className="font-black text-sm uppercase tracking-widest">Full Backup</h4>
                                    <p className="text-[10px] text-slate-400">Download all {expenses.length} records</p>
                                </div>
                                <Download size={24} />
                            </button>
                            {importRows.length > 0 && (
                                <button 
                                    onClick={executeImport}
                                    disabled={isImporting}
                                    className="flex w-full items-center justify-between p-6 rounded-3xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    <div className="text-left">
                                        <h4 className="font-black text-sm uppercase tracking-widest">{isImporting ? "Processing..." : "Commit Import"}</h4>
                                        <p className="text-[10px] text-blue-100">Add {importRows.length} new records</p>
                                    </div>
                                    <ArrowUpDown size={24} />
                                </button>
                            )}
                        </div>
                    </div>

                    {importRows.length > 0 && (
                        <div className="mt-8 space-y-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Import Preview</h4>
                            <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                                {importRows.map((r, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <div className="text-xs font-black uppercase">{r.category}</div>
                                            <div className="text-[10px] text-slate-400">{r.note || "No note"} • {r.date}</div>
                                        </div>
                                        <div className="text-sm font-black">₹{r.amount.toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* MODALS */}
      <ConfirmDialog open={!!deleteTarget} title="Delete Record" message="Once purged, this record is gone." onConfirm={() => { deleteDoc(doc(db, "users", user!.uid, "expenses", deleteTarget!)); setDeleteTarget(null); }} onCancel={() => setDeleteTarget(null)} />
      <Modal isOpen={!!editingExpense} onClose={() => setEditingExpense(null)} title="Edit Laboratory Record">
        <ExpenseForm editingExpense={editingExpense} onSuccess={() => setEditingExpense(null)} />
      </Modal>

      {/* CATEGORY PICKER FOR AUDIT */}
      <AnimatePresence>
        {showCategoryPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-end justify-center sm:items-center p-4">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black uppercase tracking-widest">Select Category</h3>
                <button onClick={() => setShowCategoryPicker(false)}><X size={20} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(c => (
                    <button key={c} onClick={() => handleAuditAction("update-category", { category: c })} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">{c}</button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSelectionMode && (
          <BulkActionBar selectedCount={selectedIds.size} onClear={() => { setSelectedIds(new Set()); setIsSelectionMode(false); }} onDelete={handleBulkDelete} onCategorize={handleBulkCategorize} userCategories={userCategories} />
        )}
      </AnimatePresence>
    </motion.main>
  );
}

function ExpenseRow({ expense, accounts, isSelected, onSelect, onEdit, onDelete }: any) {
    const acc = accounts.find((a: any) => a.id === expense.accountId);
    return (
        <div 
            onClick={onSelect}
            onContextMenu={e => { e.preventDefault(); onSelect(); }}
            className={cn(
                "group flex items-center justify-between p-4 transition-all cursor-pointer",
                isSelected ? "bg-blue-50/50 dark:bg-blue-500/10 border-l-4 border-blue-500" : "hover:bg-slate-50 dark:hover:bg-slate-950/40"
            )}
        >
            <div className="flex items-center gap-4 min-w-0">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-black uppercase", isSelected ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-blue-600 group-hover:text-white")}>
                    {expense.category[0]}
                </div>
                <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{expense.category}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-medium mt-0.5">
                        <span className="text-blue-500 font-black tracking-tighter uppercase">{expense.date}</span>
                        {acc && <span className="opacity-50">• {acc.name}</span>}
                        {expense.note && <span className="opacity-50">• {expense.note}</span>}
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className="text-sm font-black text-slate-900 dark:text-slate-100">-₹{expense.amount.toLocaleString()}</div>
                <div className="flex items-center gap-2 mt-1">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-[9px] font-black uppercase text-blue-500 hover:underline">Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-[9px] font-black uppercase text-rose-500 hover:underline">Del</button>
                </div>
            </div>
        </div>
    );
}
