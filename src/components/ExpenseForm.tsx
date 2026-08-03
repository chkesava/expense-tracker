import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { memo, useState, useEffect, useMemo, useDeferredValue } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { useAccounts } from "../hooks/useAccounts";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useExpenses } from "../hooks/useExpenses";
import { useIncomes } from "../hooks/useIncomes";
import { useAccountPayments } from "../hooks/useAccountPayments";
import { useAccountEntries } from "../hooks/useAccountEntries";
import { useAccountTransfers } from "../hooks/useAccountTransfers";
import { getAccountKind } from "../utils/accountKind";
import { previewBalanceAfterTransaction } from "../utils/accountBalance";
import { currentMonthKey, monthFromDateKey, todayDateKey } from "../utils/dates";
import { INCOME_SOURCES } from "../types/expense";
import type { Account, Expense, Income } from "../types/expense";
import { toast } from '../lib/toast';
import useSettings from "../hooks/useSettings";
import { useGamification } from "../hooks/useGamification";
import { cn } from "../lib/utils";
import { fieldClass, labelClass, segmentTrackClass, segmentActiveClass, segmentInactiveClass } from "../lib/formStyles";
import { motion, AnimatePresence } from "framer-motion";
import { useCategorizationRules } from "../hooks/useCategorizationRules";
import { useTrips } from "../hooks/useTrips";
import { shouldSuggestSplit } from "../utils/proactiveSplits";
import { SplitSuggestionToast } from "./SplitSuggestionToast";
import { useVaults } from "../hooks/useVaults";
import { Users, Calendar, Tag, CreditCard, FileText, MapPin, Zap, Camera } from "lucide-react";
import ReceiptScanner from "./ReceiptScanner";
import type { ParsedExpense } from "../utils/magicParser";
import { CategoryPicker } from "./CategoryPicker";
import { suggestCategoryFromNote } from "../data/categoryTaxonomy";

// ─── Extracted Balance Preview (Phase 2 perf fix) ───────────────────────────
// This isolates the heavy context subscriptions (expenses, incomes, payments,
// entries) into a small child component so the main form doesn't re-render
// on every real-time Firestore update.
const BalancePreviewBadge = memo(function BalancePreviewBadge({
  selectedAccount,
  selectedTypeName,
  type,
  amount,
  editingExpenseId,
  editingIncomeId,
}: {
  selectedAccount: Account | undefined;
  selectedTypeName: string;
  type: "expense" | "income" | "vault";
  amount: string;
  editingExpenseId?: string;
  editingIncomeId?: string;
}) {
  const { expenses } = useExpenses();
  const { incomes } = useIncomes();
  const { payments } = useAccountPayments();
  const { entries } = useAccountEntries();
  const { transfers } = useAccountTransfers();

  // Defer the amount to avoid blocking user input while recalculating
  const deferredAmount = useDeferredValue(amount);

  const preview = useMemo(() => {
    if (!selectedAccount || !deferredAmount || type === "vault") return null;
    const num = Number(deferredAmount);
    if (!Number.isFinite(num) || num <= 0) return null;
    const excludeId = editingExpenseId || editingIncomeId;
    return previewBalanceAfterTransaction(
      selectedAccount,
      selectedTypeName,
      expenses,
      incomes,
      type === "income" ? "income" : "expense",
      num,
      payments,
      entries,
      transfers,
      excludeId
    );
  }, [
    selectedAccount,
    selectedTypeName,
    deferredAmount,
    type,
    expenses,
    incomes,
    payments,
    entries,
    transfers,
    editingExpenseId,
    editingIncomeId,
  ]);

  if (preview == null || !selectedAccount) return null;

  return (
    <p className="mt-1 ml-1 text-[10px] font-bold text-muted-foreground">
      {getAccountKind(selectedTypeName) === "credit"
        ? `Available after: ₹${preview.toLocaleString()}`
        : `Balance after: ₹${preview.toLocaleString()}`}
    </p>
  );
});


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
  const [category, setCategory] = useState<string>(settings.defaultCategory || "Food & Dining");
  const [subcategory, setSubcategory] = useState<string>("Groceries");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [source, setSource] = useState<string>("Salary");
  const [accountId, setAccountId] = useState("");
  const [tripId, setTripId] = useState<string | null>(null);
  const [vaultId, setVaultId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [suggestionHint, setSuggestionHint] = useState<string | null>(null);

  const { accounts } = useAccounts();
  const { accountTypes } = useAccountTypes();
  const { rules } = useCategorizationRules();
  const { trips, syncTripSpentAmount } = useTrips();
  const { vaults } = useVaults();

  const handleCategoryChange = (
    nextCategory: string,
    nextSubcategory: string,
    options?: { fromUser?: boolean }
  ) => {
    setCategory(nextCategory);
    setSubcategory(nextSubcategory);
    if (options?.fromUser !== false) {
      setCategoryTouched(true);
      setSuggestionHint(null);
    }
  };

  useEffect(() => {
    if (editingExpense) {
      setType("expense");
      setAmount(editingExpense.amount.toString());
      setCategory(editingExpense.category);
      setSubcategory(editingExpense.subcategory || "");
      setTags(editingExpense.tags ?? []);
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
      const lastSub = localStorage.getItem("lastSubcategory");
      if (last) setCategory(last);
      if (lastSub) setSubcategory(lastSub);
      setTags([]);
      setDate(todayDateKey(settings.timezone));
      setCategoryTouched(false);
      const state = location.state as { tripId?: string } | null;
      setTripId(state?.tripId ?? null);
    }
  }, [editingExpense, editingIncome, location.state, settings.timezone]);

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

  const handleScanResult = (result: ParsedExpense) => {
    if (result.amount) setAmount(result.amount.toString());
    if (result.date) setDate(result.date);
    if (result.category) setCategory(result.category);
    if (result.subcategory) setSubcategory(result.subcategory);
    if (result.note) setNote(result.note);
    setCategoryTouched(true);
  };

  useEffect(() => {
    if (editingExpense || categoryTouched || type === "income") return;

    const normalizedNote = note.trim().toLowerCase();
    if (!normalizedNote) {
      setSuggestionHint(null);
      return;
    }

    const ruleMatch = rules.find((rule) =>
      normalizedNote.includes(rule.keyword.toLowerCase())
    );
    if (ruleMatch) {
      setCategory(ruleMatch.category);
      if (ruleMatch.subcategory) setSubcategory(ruleMatch.subcategory);
      setSuggestionHint(`${ruleMatch.category} › ${ruleMatch.subcategory || "…"}`);
      return;
    }

    const suggestion = suggestCategoryFromNote(note);
    if (suggestion) {
      setCategory(suggestion.category);
      setSubcategory(suggestion.subcategory);
      setSuggestionHint(`${suggestion.category} › ${suggestion.subcategory}`);
    } else {
      setSuggestionHint(null);
    }
  }, [note, rules, editingExpense, categoryTouched, type]);

  const currentMonth = currentMonthKey(settings.timezone);
  const isLocked = !!(settings.lockPastMonths && (
    (editingExpense && editingExpense.month !== currentMonth) || 
    (editingIncome && editingIncome.month !== currentMonth)
  ));

  const quickAmounts = [100, 500, 1000, 2000];

  const submit = async () => {
    if (!user || !amount || !date) return;
    setIsSubmitting(true);
    try {
      const month = monthFromDateKey(date);

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
          subcategory,
          tags,
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

      // Credit limit check is handled by the BalancePreviewBadge component
      // which shows real-time balance preview to the user while filling the form.

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
        data.subcategory = subcategory;
        data.tags = tags;
        data.tripId = tripId || null;
        data.vaultId = vaultId || null;
        localStorage.setItem("lastCategory", category);
        localStorage.setItem("lastSubcategory", subcategory);
        const { pushRecentCategoryPair } = await import("../utils/categoryPreferences");
        pushRecentCategoryPair(category, subcategory);
      } else {
        data.source = source;
      }

      const editingId = editingExpense?.id || editingIncome?.id;

      if (editingId) {
        await updateDoc(doc(db, "users", user.uid, collectionName, editingId), data);
      } else {
        await addDoc(collection(db, "users", user.uid, collectionName), {
          ...data,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: serverTimestamp(),
        });
        if (type === "expense") addXP(10);
      }

      if (type === "expense") {
        if (tripId) await syncTripSpentAmount(tripId);
        const oldTripId = editingExpense?.tripId;
        if (oldTripId && oldTripId !== tripId) await syncTripSpentAmount(oldTripId);
      }

      if (onSuccess) onSuccess();
      else navigate(type === "expense" ? "/ledger" : "/dashboard");

      toast.success(
        editingId
          ? `${type === "expense" ? "Expense" : "Income"} updated`
          : `${type === "expense" ? "Expense" : "Income"} added`
      );

      if (!editingId && type === "expense" && shouldSuggestSplit(Number(amount), note)) {
        window.setTimeout(() => {
          toast.custom(
            (id) => (
              <SplitSuggestionToast
                amount={Number(amount)}
                note={note}
                category={category}
                onSplit={(data) => navigate("/split", { state: { tab: "management", ...data } })}
                closeToast={() => toast.dismiss(id)}
              />
            ),
            { duration: 10000, unstyled: true }
          );
        }, 400);
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
      <div className={segmentTrackClass}>
        <button
          type="button"
          onClick={() => setType("expense")}
          className={cn(
            "flex-1 rounded-lg py-1.5 text-xs font-semibold uppercase tracking-wide transition-all",
            type === "expense"
              ? cn(segmentActiveClass, "text-destructive")
              : segmentInactiveClass
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
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold uppercase tracking-wide transition-all",
            type === "vault"
              ? cn(segmentActiveClass, "text-info")
              : segmentInactiveClass
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
            "flex-1 rounded-lg py-1.5 text-xs font-semibold uppercase tracking-wide transition-all",
            type === "income"
              ? cn(segmentActiveClass, "text-success")
              : segmentInactiveClass
          )}
        >
          Income
        </button>
      </div>

      {/* Amount Display */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <label className={labelClass}>
            Amount
          </label>
          {type === "expense" && (
            <ReceiptScanner onScanResult={handleScanResult} />
          )}
        </div>
        <div className="relative group">

          <span className={cn(
            "absolute left-4 top-1/2 z-10 -translate-y-1/2 text-xl font-semibold transition-colors",
            type === "expense" ? "text-destructive" : type === "vault" ? "text-info" : "text-success"
          )}>₹</span>
          <input
            type="number"
            autoFocus
            required
            className={cn(
              "w-full rounded-2xl border border-border bg-muted/40 py-4 pl-10 pr-4 text-3xl font-semibold tabular-nums text-foreground placeholder:opacity-20 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all",
              type === "expense"
                ? "focus:border-destructive"
                : type === "vault"
                  ? "focus:border-info"
                  : "focus:border-success"
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
              className="shrink-0 rounded-lg border border-border bg-muted px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/80"
            >
              +₹{q}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className={labelClass}>
            <Calendar size={10} /> Date
          </label>
          <input
            type="date"
            required
            className={fieldClass}
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        {type === "income" ? (
          <div className="space-y-1.5">
            <label className={labelClass}>
              <Tag size={10} /> Source
            </label>
            <div className="relative">
              <select
                className={cn(fieldClass, "appearance-none")}
                value={source}
                onChange={e => setSource(e.target.value)}
              >
                {INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5" />
        )}
      </div>

      {type !== "income" && (
        <>
          {suggestionHint && !categoryTouched && (
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 -mt-1 ml-1">
              Suggested from note: {suggestionHint}
            </p>
          )}
          <CategoryPicker
            category={category}
            subcategory={subcategory}
            onCategoryChange={handleCategoryChange}
            disabled={isLocked}
          />

          <div className="space-y-1.5">
            <label className={labelClass}>
              <Tag size={10} /> Tags <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                  className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
                >
                  {t} ×
                </button>
              ))}
            </div>
            <input
              className={fieldClass}
              placeholder="Add tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const next = tagInput.trim().toLowerCase();
                  if (next && !tags.includes(next)) setTags((prev) => [...prev, next]);
                  setTagInput("");
                }
              }}
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
            <label className={labelClass}>
                <CreditCard size={10} /> Account
            </label>
            <div className="relative">
                <select
                    className={cn(fieldClass, "appearance-none")}
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                >
                    <option value="">Choose Account</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
            </div>
            <BalancePreviewBadge
              selectedAccount={selectedAccount}
              selectedTypeName={selectedTypeName}
              type={type}
              amount={amount}
              editingExpenseId={editingExpense?.id}
              editingIncomeId={editingIncome?.id}
            />
        </div>

        <div className="space-y-1.5">
            <label className={labelClass}>
                <FileText size={10} /> Note
            </label>
            <input
                className={fieldClass}
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
                        <label className={labelClass}>
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
                        <label className={labelClass}>
                            <MapPin size={10} /> Link to Trip
                        </label>
                        <div className="relative">
                            <select
                                className={cn(fieldClass, "appearance-none py-2 text-xs")}
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
          "mt-2 w-full rounded-xl py-4 text-xs font-semibold uppercase tracking-[0.08em] shadow-sm transition-all",
          isLocked
            ? "cursor-not-allowed bg-muted text-muted-foreground"
            : type === "expense"
              ? "bg-destructive text-destructive-foreground shadow-destructive/20"
              : type === "vault"
                ? "bg-info text-info-foreground shadow-info/20"
                : "bg-success text-success-foreground shadow-success/20"
        )}
      >
        {isLocked ? "Locked" : isSubmitting ? "Saving..." : (editingExpense || editingIncome ? "Save Changes" : `Add ${type}`)}
      </motion.button>
    </form>
  );
}
