import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { useAccounts } from "../hooks/useAccounts";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useExpenses } from "../hooks/useExpenses";
import { useIncomes } from "../hooks/useIncomes";
import { useAccountPayments } from "../hooks/useAccountPayments";
import { useAccountEntries } from "../hooks/useAccountEntries";
import { getAccountKind } from "../utils/accountKind";
import { previewBalanceAfterTransaction } from "../utils/accountBalance";
import { useCategories } from "../hooks/useCategories";
import { CATEGORIES, INCOME_SOURCES } from "../types/expense";
import type { Expense, Income } from "../types/expense";
import { toast } from 'react-toastify';
import useSettings from "../hooks/useSettings";
import { useGamification } from "../hooks/useGamification";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useCategorizationRules } from "../hooks/useCategorizationRules";
import { useTrips } from "../hooks/useTrips";
import { shouldSuggestSplit } from "../utils/proactiveSplits";
import { SplitSuggestionToast } from "./SplitSuggestionToast";
import { useVaults } from "../hooks/useVaults";
import { Users, Calendar, Tag, CreditCard, FileText, MapPin, Zap, Camera } from "lucide-react";
import ReceiptScanner from "./ReceiptScanner";
import type { ParsedExpense } from "../utils/magicParser";


export default function ExpenseForm({ 
  editingExpense, 
  editingIncome,
  onSuccess 
}: { 
  editingExpense?: Expense | null;
  editingIncome?: Income | null;
  onSuccess?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const { addXP } = useGamification(); 

  const [type, setType] = useState<"expense" | "income" | "vault">("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<string>(settings.defaultCategory || "Food");
  const [source, setSource] = useState<string>("Salary");
  const [accountId, setAccountId] = useState("");
  const [tripId, setTripId] = useState<string | null>(null);
  const [vaultId, setVaultId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);

  const { accounts } = useAccounts();
  const { accountTypes } = useAccountTypes();
  const { expenses } = useExpenses();
  const { incomes } = useIncomes();
  const { payments } = useAccountPayments();
  const { entries } = useAccountEntries();
  const { categories: userCategories } = useCategories();
  const { rules } = useCategorizationRules();
  const { trips, syncTripSpentAmount } = useTrips();
  const { vaults } = useVaults();

  useEffect(() => {
    if (editingExpense) {
      setType("expense");
      setAmount(editingExpense.amount.toString());
      setCategory(editingExpense.category);
      setNote(editingExpense.note ?? "");
      setDate(editingExpense.date);
      setAccountId(editingExpense.accountId ?? "");
      setTripId(editingExpense.tripId ?? null);
      setVaultId(editingExpense.vaultId ?? null);
      setCategoryTouched(true);
    } else if (editingIncome) {
      setType("income");
      setAmount(editingIncome.amount.toString());
      setSource(editingIncome.source);
      setNote(editingIncome.note ?? "");
      setDate(editingIncome.date);
      setAccountId(editingIncome.accountId ?? "");
      setCategoryTouched(true);
    } else {
      const last = localStorage.getItem("lastCategory");
      if (last) setCategory(last);
      setDate(new Date().toISOString().slice(0, 10));
      setCategoryTouched(false);
      const state = location.state as { tripId?: string } | null;
      setTripId(state?.tripId ?? null);
    }
  }, [editingExpense, editingIncome, location.state]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId]
  );

  const selectedTypeName = useMemo(
    () =>
      selectedAccount
        ? accountTypes.find((t) => t.id === selectedAccount.typeId)?.name || ""
        : "",
    [selectedAccount, accountTypes]
  );

  const balancePreview = useMemo(() => {
    if (!selectedAccount || !amount || type === "vault") return null;
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) return null;
    const excludeId = editingExpense?.id || editingIncome?.id;
    return previewBalanceAfterTransaction(
      selectedAccount,
      selectedTypeName,
      expenses,
      incomes,
      type === "income" ? "income" : "expense",
      num,
      payments,
      entries,
      excludeId
    );
  }, [
    selectedAccount,
    selectedTypeName,
    amount,
    type,
    expenses,
    incomes,
    payments,
    entries,
    editingExpense?.id,
    editingIncome?.id,
  ]);

  const handleScanResult = (result: ParsedExpense) => {
    if (result.amount) setAmount(result.amount.toString());
    if (result.date) setDate(result.date);
    if (result.category) setCategory(result.category);
    if (result.note) setNote(result.note);
    setCategoryTouched(true);
  };


  useEffect(() => {
    if (editingExpense || categoryTouched) return;

    const normalizedNote = note.trim().toLowerCase();
    if (!normalizedNote) {
      return;
    }

    const match = rules.find((rule) => normalizedNote.includes(rule.keyword.toLowerCase()));
    if (!match) {
      return;
    }

    setCategory(match.category);
  }, [note, rules, editingExpense, categoryTouched]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const isLocked = !!(settings.lockPastMonths && (
    (editingExpense && editingExpense.month !== currentMonth) || 
    (editingIncome && editingIncome.month !== currentMonth)
  ));

  const quickAmounts = [100, 500, 1000, 2000];

  const submit = async () => {
    if (!user || !amount || !date) return;
    setIsSubmitting(true);
    try {
      const month = date.slice(0, 7);

      if (type === "vault") {
        if (!vaultId) {
          toast.error("Choose a vault");
          return;
        }
        const vault = vaults.find((v) => v.id === vaultId);
        if (!vault) {
          toast.error("Vault not found");
          return;
        }

        await addDoc(collection(db, "vaults", vaultId, "expenses"), {
          vaultId,
          amount: Number(amount),
          category,
          note,
          date,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          paidBy: user.uid,
          splitBetween: vault.memberIds,
        });

        toast.success("Added to vault");
        if (onSuccess) onSuccess();
        else navigate(`/vaults/${vaultId}`);
        return;
      }

      if (type === "expense" && accountId && selectedAccount) {
        const kind = getAccountKind(selectedTypeName);
        if (kind === "credit" && selectedAccount.creditLimit) {
          const preview = previewBalanceAfterTransaction(
            selectedAccount,
            selectedTypeName,
            expenses,
            incomes,
            "expense",
            Number(amount),
            payments,
            entries,
            editingExpense?.id
          );
          if (preview != null && preview < 0) {
            toast.warn("This expense exceeds available credit on this card");
          }
        }
      }

      const collectionName = type === "expense" ? "expenses" : "incomes";

      const data: Record<string, unknown> = {
        amount: Number(amount),
        date,
        note,
        month,
        accountId,
      };

      if (type === "expense") {
        data.category = category;
        data.tripId = tripId || null;
        data.vaultId = vaultId || null;
        localStorage.setItem("lastCategory", category);
      } else {
        data.source = source;
      }

      const editingId = editingExpense?.id || editingIncome?.id;

      if (editingId) {
        await updateDoc(doc(db, "users", user.uid, collectionName, editingId), data);
        toast.success(`${type === "expense" ? "Expense" : "Income"} updated`);
      } else {
        await addDoc(collection(db, "users", user.uid, collectionName), {
          ...data,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: serverTimestamp(),
        });
        toast.success(`${type === "expense" ? "Expense" : "Income"} added`);
        if (type === "expense") addXP(10);

        if (type === "expense" && shouldSuggestSplit(Number(amount), note)) {
            toast.info(
            ({ closeToast }: { closeToast?: () => void }) => (
              <SplitSuggestionToast 
                amount={Number(amount)} 
                note={note} 
                category={category}
                onSplit={(data) => navigate("/split", { state: { tab: "management", ...data } })}
                closeToast={closeToast}
              />
            ),
            { 
              autoClose: 10000,
              icon: false,
              className: "p-0 overflow-hidden rounded-2xl border border-blue-100 dark:border-blue-900 shadow-xl"
            }
          );
        }
      }

      if (type === "expense") {
        if (tripId) await syncTripSpentAmount(tripId);
        const oldTripId = editingExpense?.tripId;
        if (oldTripId && oldTripId !== tripId) await syncTripSpentAmount(oldTripId);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(type === "expense" ? "/ledger" : "/dashboard");
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed to save ${type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4 px-1">
      {/* Type Toggle */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/5">
        <button
          type="button"
          onClick={() => setType("expense")}
          className={cn(
            "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
            type === "expense" 
              ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => {
            setType("vault");
            if (!vaultId && vaults[0]?.id) setVaultId(vaults[0].id);
          }}
          className={cn(
            "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5",
            type === "vault"
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
          disabled={vaults.length === 0}
          title={vaults.length === 0 ? "Join or create a vault first" : "Add directly to a vault"}
        >
          <Users size={12} />
          Vault
        </button>
        <button
          type="button"
          onClick={() => setType("income")}
          className={cn(
            "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
            type === "income" 
              ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          Income
        </button>
      </div>

      {/* Amount Display */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
            Amount
          </label>
          {type === "expense" && (
            <ReceiptScanner onScanResult={handleScanResult} />
          )}
        </div>
        <div className="relative group">

          <span className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl z-10 transition-colors",
            type === "expense" ? "text-rose-500" : type === "vault" ? "text-blue-600" : "text-emerald-500"
          )}>₹</span>
          <input
            type="number"
            autoFocus
            required
            className={cn(
              "w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-2xl py-4 pl-10 pr-4 text-3xl font-black focus:outline-none transition-all placeholder:opacity-20",
              type === "expense"
                ? "text-slate-900 dark:text-white focus:border-rose-500"
                : type === "vault"
                  ? "text-slate-900 dark:text-white focus:border-blue-500"
                  : "text-emerald-700 dark:text-emerald-100 focus:border-emerald-500"
            )}
            placeholder="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        {/* Quick Amounts */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {quickAmounts.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(q.toString())}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-white/5"
            >
              +₹{q}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
            <Calendar size={10} /> Date
          </label>
          <input
            type="date"
            required
            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary transition-all"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
            <Tag size={10} /> {type === "income" ? "Source" : "Category"}
          </label>
          <div className="relative">
            <select
              className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 appearance-none focus:outline-none focus:border-primary transition-all"
              value={type === "income" ? source : category}
              onChange={e => {
                if (type !== "income") {
                  setCategoryTouched(true);
                  setCategory(e.target.value);
                } else {
                  setSource(e.target.value);
                }
              }}
            >
              {type !== "income" ? (
                <>
                  <optgroup label="Default">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  {userCategories.length > 0 && (
                    <optgroup label="Custom">
                      {userCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </optgroup>
                  )}
                </>
              ) : (
                INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)
              )}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                <CreditCard size={10} /> Account
            </label>
            <div className="relative">
                <select
                    className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 appearance-none focus:outline-none focus:border-primary transition-all"
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                >
                    <option value="">Choose Account</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
            </div>
            {balancePreview != null && selectedAccount && (
              <p className="mt-1 ml-1 text-[10px] font-bold text-muted-foreground">
                {getAccountKind(selectedTypeName) === "credit"
                  ? `Available after: ₹${balancePreview.toLocaleString()}`
                  : `Balance after: ₹${balancePreview.toLocaleString()}`}
              </p>
            )}
        </div>

        <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                <FileText size={10} /> Note
            </label>
            <input
                className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary transition-all"
                placeholder="..."
                value={note}
                onChange={e => setNote(e.target.value)}
            />
        </div>
      </div>

      {/* Expanded Actions Section */}
      <AnimatePresence>
        {type !== "income" && (vaults.length > 0 || trips.length > 0) && (
            <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-1"
            >
                {/* Vault Selection */}
                {vaults.length > 0 && (
                    <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            <Zap size={10} /> {type === "vault" ? "Choose Vault" : "Contribute to Vault"}
                        </label>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {type !== "vault" && (
                              <button
                                  type="button"
                                  onClick={() => setVaultId(null)}
                                  className={cn(
                                      "shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border",
                                      !vaultId ? "bg-slate-900 text-white border-slate-900" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-500"
                                  )}
                              >
                                  Personal
                              </button>
                            )}
                            {vaults.map(v => (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => setVaultId(v.id || null)}
                                    className={cn(
                                        "shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border",
                                        vaultId === v.id ? "text-white border-transparent" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-500"
                                    )}
                                    style={vaultId === v.id ? { backgroundColor: v.themeColor } : {}}
                                >
                                    {v.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Trip Selection */}
                {type === "expense" && (trips.filter(t => t.status === "active").length > 0 || !!tripId) && (
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            <MapPin size={10} /> Link to Trip
                        </label>
                        <div className="relative">
                            <select
                                className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-200 appearance-none focus:outline-none"
                                value={tripId || ""}
                                onChange={e => setTripId(e.target.value || null)}
                            >
                                <option value="">No Trip</option>
                                {trips.filter(t => t.status === "active" || t.id === tripId).map(trip => (
                                    <option key={trip.id} value={trip.id}>{trip.destination}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
                        </div>
                    </div>
                )}
            </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <motion.button
        type="submit"
        disabled={isSubmitting || isLocked}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          "w-full py-4 rounded-xl font-black text-[11px] text-white shadow-lg transition-all mt-2 uppercase tracking-[0.2em]",
          isLocked
            ? "bg-slate-400 cursor-not-allowed"
            : type === "expense"
              ? "bg-rose-500 shadow-rose-500/20"
              : type === "vault"
                ? "bg-blue-600 shadow-blue-600/20"
                : "bg-emerald-500 shadow-emerald-500/20"
        )}
      >
        {isLocked ? "🔒 Locked" : isSubmitting ? "Saving..." : (editingExpense || editingIncome ? "Save Changes" : `Add ${type}`)}
      </motion.button>
    </form>
  );
}
