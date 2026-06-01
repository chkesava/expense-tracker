import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscriptions } from "../hooks/useSubscriptions";
import { cn } from "../lib/utils";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  Plus,
  Calendar,
  Edit2,
  Trash2,
  Activity,
  Repeat,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useAccounts } from "../hooks/useAccounts";
import { CATEGORIES } from "../types/expense";
import type { Subscription } from "../types/subscription";
import Modal from "../components/common/Modal";
import { Skeleton } from "../components/common/Skeleton";
import PageHeader from "../components/layout/PageHeader";
import Amount from "../components/common/Amount";
import SegmentedTabs from "../components/ui/SegmentedTabs";
import ConfirmDialog from "../components/common/ConfirmDialog";

import { useLedgerState, type SubTab } from "../hooks/useLedgerState";

export default function SubscriptionsPage({ hideHeader }: { hideHeader?: boolean }) {
  const navigate = useNavigate();
  const { subscriptions, loading, addSubscription, updateSubscription, deleteSubscription } =
    useSubscriptions();
  const { accounts } = useAccounts();

  const { subscriptionsTab: activeTab, setSubscriptionsTab: setActiveTab } = useLedgerState();
  const [isAddingSub, setIsAddingSub] = useState(false);

  const INITIAL_FORM_DATA = {
    name: "",
    amount: "",
    category: "Subscriptions",
    day: "1",
    accountId: "",
    type: "subscription" as "subscription" | "emi",
    endMonth: (new Date().getMonth() + 1).toString(),
    endYear: new Date().getFullYear().toString(),
  };

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = subscriptions.filter((s) => s.isActive);
    const totalMonthly = active.reduce((acc, s) => acc + s.amount, 0);
    const emiCount = active.filter((s) => s.type === "emi").length;
    const subCount = active.filter((s) => s.type === "subscription").length;
    const totalYearly = totalMonthly * 12;
    return { totalMonthly, emiCount, subCount, totalYearly };
  }, [subscriptions]);

  const handleEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setFormData({
      name: sub.name,
      amount: sub.amount.toString(),
      category: sub.category,
      day: sub.dayOfMonth.toString(),
      accountId: sub.accountId || "",
      type: sub.type || "subscription",
      endMonth: (sub.endMonth || new Date().getMonth() + 1).toString(),
      endYear: (sub.endYear || new Date().getFullYear()).toString(),
    });
    setIsAddingSub(true);
  };

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const subData = {
      ...formData,
      amount: Number(formData.amount),
      dayOfMonth: Number(formData.day),
      isActive: editingSub ? editingSub.isActive : true,
      endMonth: formData.type === "emi" ? Number(formData.endMonth) : undefined,
      endYear: formData.type === "emi" ? Number(formData.endYear) : undefined,
    };
    if (editingSub?.id) {
      await updateSubscription(editingSub.id, subData);
    } else {
      await addSubscription(subData);
    }
    setIsAddingSub(false);
    setEditingSub(null);
  };

  const tabs = [
    { id: "recurring", label: "Recurring", icon: <Repeat size={16} /> },
    { id: "stats", label: "Stats", icon: <Activity size={16} /> },
  ];

  const openAdd = () => {
    setEditingSub(null);
    setFormData(INITIAL_FORM_DATA);
    setIsAddingSub(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(hideHeader ? "space-y-6" : "mx-auto max-w-4xl space-y-6 px-4 pb-32 pt-24")}
    >
      {!hideHeader && (
        <PageHeader
          title="Planning Hub"
          subtitle="Manage subscriptions and travel budgets."
          icon={<Calendar size={24} />}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          rightElement={
            <button
              onClick={() => (activeTab === "recurring" ? openAdd() : navigate("/travel/new"))}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">
                New {activeTab === "recurring" ? "Bill" : "Trip"}
              </span>
              <span className="sm:hidden">New</span>
            </button>
          }
        />
      )}
      {hideHeader && (
        <SegmentedTabs
          items={tabs}
          value={activeTab}
          onChange={(next) => setActiveTab(next as SubTab)}
          ariaLabel="Recurring sections"
          layoutId="subscriptions-embedded-tab-pill"
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-4"
        >
          {/* ───────── RECURRING TAB ───────── */}
          {activeTab === "recurring" && (
            <>
              {/* Add button when embedded */}
              {hideHeader && (
                <button
                  onClick={openAdd}
                  className="w-full flex items-center justify-between p-5 bg-blue-600 text-white rounded-[2rem] shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                      <Plus size={22} />
                    </div>
                    <div className="text-left">
                      <div className="text-base font-black tracking-tight">Add Recurring Bill</div>
                      <div className="text-[10px] font-bold opacity-70 uppercase tracking-widest">
                        Subscription, EMI, or Bill
                      </div>
                    </div>
                  </div>
                  <Plus size={20} className="opacity-60 shrink-0" />
                </button>
              )}

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                  ))}
                </div>
              ) : subscriptions.length === 0 ? (
                <div className="py-20 text-center text-slate-400 bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] border border-dashed border-white/60 dark:border-slate-800/60">
                  <CreditCard size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-bold">No recurring bills yet</p>
                  <p className="text-sm mt-1 opacity-60">Tap + New Bill to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subscriptions.map((sub) => (
                    <SubscriptionRow
                      key={sub.id}
                      sub={sub}
                      accounts={accounts}
                      onEdit={() => handleEdit(sub)}
                      onToggle={() => updateSubscription(sub.id!, { isActive: !sub.isActive })}
                      onDelete={() => setDeleteTargetId(sub.id!)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ───────── STATS TAB ───────── */}
          {activeTab === "stats" && (
            <div className="space-y-4">
              {/* KPI grid — 2 cols on mobile, 4 on desktop */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard
                  label="Monthly Cost"
                  value={<Amount value={stats.totalMonthly} />}
                  isPrimary
                />
                <StatCard
                  label="Yearly Cost"
                  value={<Amount value={stats.totalYearly} />}
                />
                <StatCard
                  label="Subscriptions"
                  value={String(stats.subCount)}
                />
                <StatCard
                  label="Installments"
                  value={String(stats.emiCount)}
                />
              </div>

              {/* Per-subscription breakdown */}
              {subscriptions.filter((s) => s.isActive).length > 0 && (
                <div className="premium-card p-5">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                    Breakdown
                  </h3>
                  <div className="space-y-3">
                    {subscriptions
                      .filter((s) => s.isActive)
                      .sort((a, b) => b.amount - a.amount)
                      .map((sub) => {
                        const pct =
                          stats.totalMonthly > 0
                            ? Math.round((sub.amount / stats.totalMonthly) * 100)
                            : 0;
                        return (
                          <div key={sub.id} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-bold text-slate-700 dark:text-slate-200 truncate mr-2">
                                {sub.name}
                              </span>
                              <span className="font-black text-slate-900 dark:text-white shrink-0">
                                <Amount value={sub.amount} />
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.5 }}
                                  className="h-full bg-blue-500 rounded-full"
                                />
                              </div>
                              <span className="text-[10px] font-black text-slate-400 w-8 text-right">
                                {pct}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ───────── ADD / EDIT MODAL ───────── */}
      <Modal
        isOpen={isAddingSub}
        onClose={() => {
          setIsAddingSub(false);
          setEditingSub(null);
        }}
        title={editingSub ? "Modify Bill" : "New Recurring Bill"}
      >
        <form onSubmit={handleSubSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Service Name
            </label>
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Netflix, Rent, Car Loan"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Amount + Day */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Amount
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Billing Day
              </label>
              <select
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500"
              >
                {[...Array(31)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Day {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as "subscription" | "emi" })
                }
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500"
              >
                <option value="subscription">Subscription</option>
                <option value="emi">EMI / Loan</option>
              </select>
            </div>
          </div>

          {/* EMI end date */}
          {formData.type === "emi" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  End Month
                </label>
                <select
                  value={formData.endMonth}
                  onChange={(e) => setFormData({ ...formData, endMonth: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500"
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleString("default", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  End Year
                </label>
                <select
                  value={formData.endYear}
                  onChange={(e) => setFormData({ ...formData, endYear: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500"
                >
                  {[...Array(10)].map((_, i) => {
                    const y = new Date().getFullYear() + i;
                    return (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}

          {/* Account */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Auto-Deduct From
            </label>
            <select
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500"
            >
              <option value="">Manual / No Account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-4 mt-2 bg-blue-600 text-white font-black rounded-3xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
          >
            {editingSub ? "Update Bill" : "Create Bill"}
          </button>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!deleteTargetId}
        title="Archive recurring bill?"
        message="You can re-enable it later. Existing records remain unchanged."
        variant="warning"
        confirmText="Archive"
        cancelText="Cancel"
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={async () => {
          if (!deleteTargetId) return;
          await deleteSubscription(deleteTargetId);
          setDeleteTargetId(null);
        }}
      />
    </motion.div>
  );
}

/* ─────────────── Subscription Row ─────────────── */
function SubscriptionRow({ sub, accounts, onEdit, onToggle, onDelete }: any) {
  const accountName =
    accounts.find((a: any) => a.id === sub.accountId)?.name || "External";

  return (
    <div
      className={cn(
        "bento-card overflow-hidden transition-all",
        !sub.isActive && "opacity-50 grayscale"
      )}
    >
      {/* Top row */}
      <div className="flex items-center gap-4 p-4">
        {/* Avatar */}
        <div className="w-12 h-12 shrink-0 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center font-black text-white dark:text-slate-900 text-lg shadow-md">
          {sub.name[0].toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-0.5">
            {sub.type === "emi" ? "EMI / Installment" : "Monthly Service"}
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white truncate leading-tight">
            {sub.name}
          </h4>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5 truncate">
            Day {sub.dayOfMonth} • {accountName}
          </p>
        </div>

        {/* Amount — always visible, no overflow */}
        <div className="shrink-0 text-right">
          <div className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            <Amount value={sub.amount} />
          </div>
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            /month
          </div>
        </div>
      </div>

      {/* Action bar — always on bottom, full width on mobile */}
      <div className="flex items-center border-t border-slate-100 dark:border-white/5 divide-x divide-slate-100 dark:divide-white/5">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        >
          {sub.isActive ? (
            <ToggleRight size={14} className="text-emerald-500" />
          ) : (
            <ToggleLeft size={14} />
          )}
          {sub.isActive ? "Active" : "Paused"}
        </button>
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
        >
          <Edit2 size={12} />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
        >
          <Trash2 size={12} />
          Remove
        </button>
      </div>
    </div>
  );
}

/* ─────────────── Stat Card ─────────────── */
function StatCard({ label, value, isPrimary }: { label: string; value: React.ReactNode; isPrimary?: boolean }) {
  return (
    <div className={cn("p-5 bento-card flex flex-col justify-between", isPrimary && "bg-primary text-primary-foreground")}>
      <div className={cn("text-[10px] font-black uppercase tracking-widest opacity-60 mb-2", isPrimary ? "text-primary-foreground/75" : "text-slate-400")}>{label}</div>
      <div className="text-2xl font-black tracking-tighter">{value}</div>
    </div>
  );
}
