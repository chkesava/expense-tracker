import { useExpenses } from "../hooks/useExpenses";
import { useIncomes } from "../hooks/useIncomes";
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
    Plus,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    MoreVertical,
    Edit2,
    Trash2,
    FileText,
    Loader2,
    Share2
} from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

import PageHeader from "../components/layout/PageHeader";
import BulkActionBar from "../components/BulkActionBar";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Modal from "../components/common/Modal";
import ExpenseForm from "../components/ExpenseForm";
import { Skeleton } from "../components/common/Skeleton";
import Amount from "../components/common/Amount";
import { Badge } from "../components/common/Badge";

import type { Income } from "../types/expense";
import { CATEGORIES } from "../types/expense";
import { getMonthlySummary } from "../utils/monthSummary";
import { groupExpensesByDay } from "../utils/dayGrouping";
import { exportExpensesToCSV } from "../utils/exportCsv";
import { getIncomeSummary, groupIncomesByDay } from "../utils/incomeSummary";
import { INCOME_SOURCES } from "../types/expense";

// Audit Components
import AuditCard from "../components/audit/AuditCard";
import AuditControls from "../components/audit/AuditControls";

type ExpensesTab = "history" | "income" | "audit" | "data";

export default function ExpenseListPage({ hideHeader }: { hideHeader?: boolean }) {
    const { settings } = useSettings();
    const { expenses, loading: expensesLoading } = useExpenses();
    const { incomes, loading: incomesLoading } = useIncomes();
    const loading = expensesLoading || incomesLoading;
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
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportType, setReportType] = useState<"pdf" | "csv">("pdf");
    const [defaultImportAccountId, setDefaultImportAccountId] = useState("");

    // --- COMMON UI STATE ---
    const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: "expense" | "income" } | null>(null);
    const [editingExpense, setEditingExpense] = useState<any | null>(null);
    const [editingIncome, setEditingIncome] = useState<any | null>(null);
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

    // --- LOGIC: INCOME ---
    const [incomeQuery, setIncomeQuery] = useState("");
    const [selectedSource, setSelectedSource] = useState("");

    const filteredIncomes = useMemo(() => incomes.filter(i => i.month === selectedMonth), [incomes, selectedMonth]);
    const searchedIncomes = useMemo(() => {
        let res = filteredIncomes.filter(i => {
            if (selectedSource && i.source !== selectedSource) return false;
            if (incomeQuery) {
                const q = incomeQuery.toLowerCase();
                return (i.note || "").toLowerCase().includes(q) || i.source.toLowerCase().includes(q) || String(i.amount).includes(q);
            }
            return true;
        });
        res.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return res;
    }, [filteredIncomes, incomeQuery, selectedSource]);

    const incomeSummary = useMemo(() => getIncomeSummary(searchedIncomes), [searchedIncomes]);
    const { today: iToday, yesterday: iYesterday, earlier: iEarlier } = useMemo(() => groupIncomesByDay(searchedIncomes, settings.timezone), [searchedIncomes, settings.timezone]);

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

    const generateReport = async () => {
        setIsGenerating(true);
        try {
            // Aesthetic delay for the "Wow" factor animation
            await new Promise(r => setTimeout(r, 2500));

            if (reportType === "csv") {
                exportExpensesToCSV(expenses, `Vault_Report_${selectedMonth}.csv`);
            } else {
                const doc = new jsPDF();

                // Add Header
                doc.setFontSize(22);
                doc.setTextColor(79, 70, 229); // Electric Indigo
                doc.text("VAULT FINANCIAL REPORT", 14, 22);

                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
                doc.text(`Period: ${selectedMonth}`, 14, 35);

                // Stats Summary
                const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
                const totalInc = incomes.reduce((s, i) => s + i.amount, 0);

                doc.setFontSize(12);
                doc.setTextColor(0);
                doc.text(`Total Income: ₹${totalInc.toLocaleString()}`, 14, 50);
                doc.text(`Total Expenses: ₹${totalExp.toLocaleString()}`, 14, 57);
                doc.text(`Net Savings: ₹${(totalInc - totalExp).toLocaleString()}`, 14, 64);

                // Table
                const tableData = expenses.map(e => [
                    e.date,
                    e.category,
                    e.note || "-",
                    `₹${e.amount.toLocaleString()}`
                ]);

                (doc as any).autoTable({
                    startY: 75,
                    head: [['Date', 'Category', 'Note', 'Amount']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [79, 70, 229],
                        fontSize: 10,
                        fontStyle: 'bold'
                    },
                    styles: { fontSize: 9 },
                    alternateRowStyles: { fillColor: [245, 247, 250] }
                });

                doc.save(`Vault_Report_${selectedMonth}.pdf`);
            }
            toast.success("Report Generated Successfully!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to generate report");
        } finally {
            setIsGenerating(false);
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

    return (
        <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("min-h-screen bg-slate-50 dark:bg-slate-950 pb-32", hideHeader ? "pt-0" : "pt-24")}>
            {!hideHeader && (
                <PageHeader
                    title="Vault Ledger"
                    subtitle="Precision Financial Tracking"
                    icon={<History className="text-blue-600" />}
                    rightElement={
                        <div className="flex gap-2">
                            <button onClick={() => setIsSelectionMode(!isSelectionMode)} className={cn("p-3 rounded-2xl transition-all", isSelectionMode ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-900 text-slate-400 hover:text-blue-600")}>
                                <Plus className={cn("transition-transform", isSelectionMode && "rotate-45")} />
                            </button>
                        </div>
                    }
                />
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Tabs Navigation */}
                <div className="flex p-1.5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-[2rem] border border-white/20 dark:border-white/5 mb-10 w-fit mx-auto sm:mx-0">
                    {(["history", "income", "audit", "data"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                activeTab === tab
                                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl scale-105"
                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === "history" && (
                            <div className="space-y-6">
                                {/* Filters & Search */}
                                <div className="bento-card p-4 sm:p-6">
                                    <div className="flex flex-col md:flex-row gap-4 items-center">
                                        <div className="relative flex-1 w-full">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                value={query}
                                                onChange={e => setQuery(e.target.value)}
                                                placeholder="Search ledger..."
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500/20"
                                            />
                                        </div>
                                        <div className="flex gap-2 w-full md:w-auto">
                                            <button onClick={() => setShowFilters(!showFilters)} className={cn("flex-1 md:flex-none flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all", showFilters ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800")}>
                                                <Filter size={14} /> Filters
                                            </button>
                                            <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="flex-1 md:w-32 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none">
                                                <option value="desc">Newest</option>
                                                <option value="asc">Oldest</option>
                                            </select>
                                        </div>
                                    </div>
                                    <AnimatePresence>
                                        {showFilters && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                                                    <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none">
                                                        <option value="">All Categories</option>
                                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                    <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none">
                                                        <option value="">All Accounts</option>
                                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                    </select>
                                                    <select value={selectedAccountTypeId} onChange={e => setSelectedAccountTypeId(e.target.value)} className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none">
                                                        <option value="">Account Type</option>
                                                        {accountTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                    </select>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="bento-card min-h-[500px] overflow-hidden">
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Transaction Stream</h3>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Monthly Burn</div>
                                                <div className="text-sm font-black text-rose-600 dark:text-rose-400"><Amount value={historySummary.total} /></div>
                                            </div>
                                        </div>
                                    </div>

                                    {loading ? <Skeleton className="h-full w-full" /> : (
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {searchedExpenses.length === 0 ? (
                                                <div className="py-20 text-center text-slate-400 italic text-sm">No transactions found for this period</div>
                                            ) : (
                                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {today.length > 0 && (
                                                        <div className="bg-blue-50/10 dark:bg-blue-500/5">
                                                            <div className="px-5 py-3 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100 dark:border-white/5">
                                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Today</span>
                                                                <Badge variant="ghost" className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0">
                                                                    Total: <Amount value={today.reduce((acc, curr) => acc + curr.amount, 0)} />
                                                                </Badge>
                                                            </div>
                                                            {today.map(e => (
                                                                <ExpenseRow
                                                                    key={e.id}
                                                                    expense={e}
                                                                    accounts={accounts}
                                                                    isSelected={selectedIds.has(e.id!)}
                                                                    onSelect={() => isSelectionMode && toggleSelection(e.id!)}
                                                                    onEdit={() => setEditingExpense(e)}
                                                                    onDelete={() => setDeleteTarget({ id: e.id!, type: "expense" })}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                    {yesterday.length > 0 && (
                                                        <div className="bg-slate-50/10 dark:bg-white/2">
                                                            <div className="px-5 py-3 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100 dark:border-white/5">
                                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Yesterday</span>
                                                                <Badge variant="ghost" className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-0">
                                                                    Total: <Amount value={yesterday.reduce((acc, curr) => acc + curr.amount, 0)} />
                                                                </Badge>
                                                            </div>
                                                            {yesterday.map(e => (
                                                                <ExpenseRow
                                                                    key={e.id}
                                                                    expense={e}
                                                                    accounts={accounts}
                                                                    isSelected={selectedIds.has(e.id!)}
                                                                    onSelect={() => isSelectionMode && toggleSelection(e.id!)}
                                                                    onEdit={() => setEditingExpense(e)}
                                                                    onDelete={() => setDeleteTarget({ id: e.id!, type: "expense" })}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                    {earlier.length > 0 && (
                                                        <div className="bg-slate-50/50 dark:bg-white/2">
                                                            <div className="px-5 py-3 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100 dark:border-white/5">
                                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Earlier</span>
                                                                <Badge variant="ghost" className="bg-slate-50 dark:bg-white/2 text-slate-400 border-0">
                                                                    Total: <Amount value={earlier.reduce((acc, curr) => acc + curr.amount, 0)} />
                                                                </Badge>
                                                            </div>
                                                            {earlier.map(e => (
                                                                <ExpenseRow
                                                                    key={e.id}
                                                                    expense={e}
                                                                    accounts={accounts}
                                                                    isSelected={selectedIds.has(e.id!)}
                                                                    onSelect={() => isSelectionMode && toggleSelection(e.id!)}
                                                                    onEdit={() => setEditingExpense(e)}
                                                                    onDelete={() => setDeleteTarget({ id: e.id!, type: "expense" })}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === "income" && (
                            <div className="space-y-6">
                                {/* Top Filter Bar */}
                                <div className="bento-card p-4 sm:p-6">
                                    <div className="flex flex-col md:flex-row gap-4 items-center">
                                        <div className="relative flex-1 w-full">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                value={incomeQuery}
                                                onChange={e => setIncomeQuery(e.target.value)}
                                                placeholder="Search earnings..."
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 ring-emerald-500/20"
                                            />
                                        </div>
                                        <div className="flex gap-2 w-full md:w-auto">
                                            <select value={selectedSource} onChange={e => setSelectedSource(e.target.value)} className="flex-1 md:w-48 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none">
                                                <option value="">All Sources</option>
                                                {INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <button onClick={() => { setIncomeQuery(""); setSelectedSource(""); }} className="text-[10px] font-black uppercase text-slate-400 hover:text-emerald-500 transition-colors shrink-0 px-2">Clear</button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Summary */}
                                    <div className="bento-card p-6 sm:p-8 bg-emerald-600/5 border-emerald-500/20">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Monthly Earnings Pulse</h3>
                                            <span className="text-[9px] font-black bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-md uppercase tracking-widest">
                                                {selectedMonth}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl sm:text-5xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter"><Amount value={incomeSummary.total} /></span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">total earned</span>
                                        </div>
                                    </div>

                                    {/* Income Items */}
                                    <div className="bento-card min-h-[400px] overflow-hidden">
                                        {loading ? <Skeleton className="h-full w-full" /> : (

                                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {[...iToday, ...iYesterday, ...iEarlier].length === 0 ? (
                                                    <div className="py-20 text-center text-slate-400 italic">No income matches found</div>
                                                ) : (
                                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                        {iToday.length > 0 && (
                                                            <div className="bg-emerald-50/10 dark:bg-emerald-500/5">
                                                                <div className="px-5 py-3 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100 dark:border-white/5">
                                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Today</span>
                                                                    <Badge variant="ghost" className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
                                                                        Total: <Amount value={iToday.reduce((acc, curr) => acc + curr.amount, 0)} />
                                                                    </Badge>
                                                                </div>
                                                                {iToday.map(i => (
                                                                    <IncomeRow
                                                                        key={i.id}
                                                                        income={i}
                                                                        accounts={accounts}
                                                                        onEdit={() => setEditingIncome(i)}
                                                                        onDelete={() => setDeleteTarget({ id: i.id!, type: "income" })}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                        {iYesterday.length > 0 && (
                                                            <div className="bg-emerald-50/10 dark:bg-emerald-500/5">
                                                                <div className="px-5 py-3 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100 dark:border-white/5">
                                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Yesterday</span>
                                                                    <Badge variant="ghost" className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-0">
                                                                        Total: <Amount value={iYesterday.reduce((acc, curr) => acc + curr.amount, 0)} />
                                                                    </Badge>
                                                                </div>
                                                                {iYesterday.map(i => (
                                                                    <IncomeRow
                                                                        key={i.id}
                                                                        income={i}
                                                                        accounts={accounts}
                                                                        onEdit={() => setEditingIncome(i)}
                                                                        onDelete={() => setDeleteTarget({ id: i.id!, type: "income" })}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                        {iEarlier.length > 0 && (
                                                            <div className="bg-emerald-50/10 dark:bg-emerald-500/5">
                                                                <div className="px-5 py-3 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100 dark:border-white/5">
                                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Earlier</span>
                                                                    <Badge variant="ghost" className="bg-slate-50 dark:bg-white/2 text-slate-400 border-0">
                                                                        Total: <Amount value={iEarlier.reduce((acc, curr) => acc + curr.amount, 0)} />
                                                                    </Badge>
                                                                </div>
                                                                {iEarlier.map(i => (
                                                                    <IncomeRow
                                                                        key={i.id}
                                                                        income={i}
                                                                        accounts={accounts}
                                                                        onEdit={() => setEditingIncome(i)}
                                                                        onDelete={() => setDeleteTarget({ id: i.id!, type: "income" })}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "audit" && (
                            <div className="flex flex-col items-center">
                                <div className="w-full max-w-md mb-8 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 p-4 rounded-3xl border border-white/20">
                                    <div className="text-left">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Audit Mode</h3>
                                        <p className="text-xs font-bold">{auditRemaining} tasks left</p>
                                    </div>
                                    <div className="h-1.5 w-32 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${(auditIndex / auditTotal) * 100}%` }} className="h-full bg-blue-600" />
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

                        {activeTab === "data" && (
                            <div className="space-y-8">
                                <section className="bento-card p-6">
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

                                        <div className="space-y-6">
                                            <div className="bento-card p-8 bg-slate-900 text-white border-none relative overflow-hidden">
                                                {/* Decorative Background Elements */}
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -ml-12 -mb-12" />

                                                <div className="relative z-10">
                                                    <div className="flex items-center justify-between mb-8">
                                                        <div>
                                                            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-blue-400 mb-1">Vault Intelligence</h4>
                                                            <h3 className="text-xl font-black tracking-tight">Generate Financial Report</h3>
                                                        </div>
                                                        <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xl">
                                                            <FileText className="text-white" size={24} />
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 mb-8">
                                                        <button
                                                            onClick={() => setReportType("pdf")}
                                                            className={cn(
                                                                "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                                reportType === "pdf" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                                                            )}
                                                        >
                                                            PDF Document
                                                        </button>
                                                        <button
                                                            onClick={() => setReportType("csv")}
                                                            className={cn(
                                                                "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                                reportType === "csv" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                                                            )}
                                                        >
                                                            CSV Spreadsheet
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={generateReport}
                                                        disabled={isGenerating}
                                                        className="w-full relative group h-16 rounded-[2rem] bg-gradient-to-r from-blue-600 to-indigo-600 font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 overflow-hidden"
                                                    >
                                                        <AnimatePresence mode="wait">
                                                            {isGenerating ? (
                                                                <motion.div
                                                                    key="loading"
                                                                    initial={{ y: 20, opacity: 0 }}
                                                                    animate={{ y: 0, opacity: 1 }}
                                                                    exit={{ y: -20, opacity: 0 }}
                                                                    className="flex items-center justify-center gap-3"
                                                                >
                                                                    <Loader2 className="animate-spin" size={18} />
                                                                    <span>Crafting Report...</span>
                                                                </motion.div>
                                                            ) : (
                                                                <motion.div
                                                                    key="ready"
                                                                    initial={{ y: 20, opacity: 0 }}
                                                                    animate={{ y: 0, opacity: 1 }}
                                                                    exit={{ y: -20, opacity: 0 }}
                                                                    className="flex items-center justify-center gap-3"
                                                                >
                                                                    <Share2 size={18} />
                                                                    <span>Generate {reportType.toUpperCase()}</span>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>

                                                        {/* Shimmer Effect */}
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
                                                    </button>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => exportExpensesToCSV(expenses, `Vault_Backup_${new Date().toISOString().split('T')[0]}.csv`)}
                                                className="flex w-full items-center justify-between p-6 rounded-[2.5rem] bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                                            >
                                                <div className="text-left">
                                                    <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-600 transition-colors">Data Management</h4>
                                                    <h3 className="font-black text-sm uppercase tracking-widest mt-1">Full System Backup</h3>
                                                    <p className="text-[10px] text-slate-400 mt-1">Export all {expenses.length} records</p>
                                                </div>
                                                <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                    <Download size={20} />
                                                </div>
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
                                                        <div className="text-sm font-black"><Amount value={r.amount} /></div>
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
            </div>

            {/* MODALS */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Purge Record"
                message="Delete this entry permanently?"
                onConfirm={async () => {
                    if (!user || !deleteTarget) return;
                    const collectionName = deleteTarget.type === "expense" ? "expenses" : "incomes";
                    await deleteDoc(doc(db, "users", user.uid, collectionName, deleteTarget.id));
                    setDeleteTarget(null);
                    toast.success("Deleted!");
                }}
                onCancel={() => setDeleteTarget(null)}
            />
            <Modal isOpen={!!editingExpense || !!editingIncome} onClose={() => { setEditingExpense(null); setEditingIncome(null); }} title="Edit Transaction">
                <ExpenseForm
                    editingExpense={editingExpense}
                    editingIncome={editingIncome}
                    onSuccess={() => { setEditingExpense(null); setEditingIncome(null); }}
                />
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
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div
            onClick={onSelect}
            className={cn(
                "group relative flex flex-col p-5 transition-all cursor-pointer border-b border-slate-50 dark:border-white/5 last:border-0",
                isSelected ? "bg-blue-50/50 dark:bg-blue-500/5 ring-1 ring-inset ring-blue-500/20 shadow-inner" : "hover:bg-slate-50/80 dark:hover:bg-white/5"
            )}
        >
            {/* Account Ribbon Tag */}
            {acc && (
                <Badge variant="danger" isRibbon className="right-12 px-2.5 py-0.5 text-[7px]">
                    {acc.name}
                </Badge>
            )}

            {/* Three Dots Menu Button */}
            <div className="absolute top-4 right-4">
                <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
                >
                    <MoreVertical size={16} />
                </button>

                <AnimatePresence>
                    {showMenu && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-10"
                                onClick={() => setShowMenu(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 top-10 z-20 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors border-b border-slate-50 dark:border-white/5"
                                >
                                    <Edit2 size={12} /> Edit
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                >
                                    <Trash2 size={12} /> Delete
                                </button>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex items-start justify-between gap-4 pt-3">
                <div className="flex items-center gap-5 min-w-0">
                    <div className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black uppercase transition-all duration-300 shadow-sm",
                        isSelected ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "bg-slate-100 dark:bg-white/5 text-slate-500 group-hover:scale-110"
                    )}>
                        {expense.category[0]}
                    </div>
                    <div className="min-w-0 flex flex-col gap-0.5">
                        <div className="font-bold text-[16px] text-slate-900 dark:text-white tracking-tight group-hover:text-rose-600 transition-colors truncate pr-16">{expense.category}</div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded-md">{expense.date}</span>
                            {expense.note && (
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 italic font-medium truncate max-w-[100px] sm:max-w-none">
                                    {expense.note}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="text-right shrink-0 self-center pr-8 sm:pr-0">
                    <div className="text-xl font-black text-slate-900 dark:text-white tracking-tightest group-hover:scale-105 transition-transform"><Amount value={expense.amount} /></div>
                </div>
            </div>
        </div>
    );
}

function IncomeRow({ income, accounts, onEdit, onDelete }: any) {
    const acc = accounts.find((a: any) => a.id === income.accountId);
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="group relative flex flex-col p-5 transition-all hover:bg-slate-50/80 dark:hover:bg-white/5 border-b border-slate-50 dark:border-white/5 last:border-0 cursor-pointer">
            {/* Account Ribbon Tag */}
            {acc && (
                <Badge variant="success" isRibbon className="right-12 px-2.5 py-0.5 text-[7px]">
                    {acc.name}
                </Badge>
            )}

            {/* Three Dots Menu Button */}
            <div className="absolute top-4 right-4">
                <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
                >
                    <MoreVertical size={16} />
                </button>

                <AnimatePresence>
                    {showMenu && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-10"
                                onClick={() => setShowMenu(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 top-10 z-20 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors border-b border-slate-50 dark:border-white/5"
                                >
                                    <Edit2 size={12} /> Edit
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                >
                                    <Trash2 size={12} /> Delete
                                </button>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex items-start justify-between gap-4 pt-3">
                <div className="flex items-center gap-5 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-black uppercase group-hover:scale-110 transition-transform shadow-sm">
                        {income.source[0]}
                    </div>
                    <div className="min-w-0 flex flex-col gap-0.5">
                        <div className="font-bold text-[16px] text-slate-900 dark:text-white tracking-tight group-hover:text-emerald-600 transition-colors truncate pr-16">{income.source}</div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded-md">{income.date}</span>
                            {income.note && (
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 italic font-medium truncate max-w-[100px] sm:max-w-none">
                                    {income.note}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="text-right shrink-0 self-center pr-8 sm:pr-0">
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter"><Amount value={income.amount} prefix="+₹" /></div>
                </div>
            </div>
        </div>
    );
}
