import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscriptions } from "../hooks/useSubscriptions";
import { useTrips } from "../hooks/useTrips";
import { cn } from "../lib/utils";
import { useNavigate } from "react-router-dom";
import { 
  Plane, 
  CreditCard, 
  Plus, 
  Calendar,
  ChevronRight,
  Clock,
  Edit2,
  Trash2,
  Activity,
  Repeat
} from "lucide-react";
import { useAccounts } from "../hooks/useAccounts";
import { CATEGORIES } from "../types/expense";
import type { Subscription } from "../types/subscription";
import Modal from "../components/common/Modal";
import { Skeleton } from "../components/common/Skeleton";
import PageHeader from "../components/layout/PageHeader";
import Amount from "../components/common/Amount";


type SubTab = "recurring" | "stats";

export default function SubscriptionsPage({ hideHeader }: { hideHeader?: boolean }) {
  const navigate = useNavigate();
  const { subscriptions, loading, addSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
  const { trips, loading: tripsLoading } = useTrips();
  const { accounts } = useAccounts();
  
  const [activeTab, setActiveTab] = useState<SubTab>("recurring");
  const [isAddingSub, setIsAddingSub] = useState(false);

  const INITIAL_FORM_DATA = {
    name: "",
    amount: "",
    category: "Subscriptions",
    day: "1",
    accountId: "",
    type: "subscription" as "subscription" | "emi",
    endMonth: (new Date().getMonth() + 1).toString(),
    endYear: new Date().getFullYear().toString()
  };

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  const stats = useMemo(() => {
    const totalMonthly = subscriptions.filter(s => s.isActive).reduce((acc, s) => acc + s.amount, 0);
    const emiCount = subscriptions.filter(s => s.type === "emi" && s.isActive).length;
    const subCount = subscriptions.filter(s => s.type === "subscription" && s.isActive).length;
    return { totalMonthly, emiCount, subCount };
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
      endYear: (sub.endYear || new Date().getFullYear()).toString()
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

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "mx-auto max-w-4xl px-4 pb-32",
        !hideHeader && "pt-24"
      )}
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
                onClick={() => {
                  if (activeTab === "recurring") {
                    setEditingSub(null);
                    setFormData(INITIAL_FORM_DATA);
                    setIsAddingSub(true);
                  } else {
                    navigate("/travel/new");
                  }
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
                <Plus size={18} />
                <span>New {activeTab === "recurring" ? "Bill" : "Trip"}</span>
            </button>
          }
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            
            {activeTab === "recurring" && (
                <div className="space-y-4">
                    {hideHeader && (
                      <button
                        onClick={() => {
                          setEditingSub(null);
                          setFormData(INITIAL_FORM_DATA);
                          setIsAddingSub(true);
                        }}
                        className="w-full flex items-center justify-between p-6 bg-blue-600 text-white rounded-[2rem] shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Plus size={24} />
                          </div>
                          <div className="text-left">
                            <div className="text-lg font-black tracking-tight">Add New Recurring</div>
                            <div className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Subscription, EMI, or Bill</div>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                          <ChevronRight size={20} />
                        </div>
                      </button>
                    )}
                    {loading ? <Skeleton className="h-48 w-full" /> : (
                        subscriptions.length === 0 ? (
                            <div className="py-20 text-center text-slate-400 bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] border border-dashed border-white/60 dark:border-slate-800/60">
                                <CreditCard size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-bold">No active subscriptions</p>
                            </div>
                        ) : (
                            subscriptions.map(sub => (
                                <SubscriptionRow 
                                  key={sub.id} 
                                  sub={sub} 
                                  accounts={accounts} 
                                  onEdit={() => handleEdit(sub)} 
                                  onToggle={() => updateSubscription(sub.id!, { isActive: !sub.isActive })} 
                                  onDelete={() => deleteSubscription(sub.id!)} 
                                />
                            ))
                        )
                    )}
                </div>
            )}


            {activeTab === "stats" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-8 rounded-2xl border border-white/10 shadow-2xl">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">Monthly Commitment</div>
                        <div className="text-4xl font-black tracking-tighter"><Amount value={stats.totalMonthly} /></div>
                    </div>
                    <div className="bg-white dark:bg-slate-900/40 p-8 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Total Subscriptions</div>
                        <div className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{stats.subCount}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900/40 p-8 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Active Installments</div>
                        <div className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{stats.emiCount}</div>
                    </div>
                </div>
            )}

        </motion.div>
      </AnimatePresence>

      <Modal isOpen={isAddingSub} onClose={() => { setIsAddingSub(false); setEditingSub(null); }} title={editingSub ? "Modify Bill" : "Launch Bill"}>
          <form onSubmit={handleSubSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Service Name</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Netflix, Rent" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold" required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Amount</label>
                    <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Billing Day</label>
                    <select value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold">
                      {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>Day {i+1}</option>)}
                    </select>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold">
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Type</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as "subscription" | "emi"})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold">
                      <option value="subscription">Subscription</option>
                      <option value="emi">EMI / Loan</option>
                    </select>
                  </div>
              </div>

              {formData.type === "emi" && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">End Month</label>
                    <select value={formData.endMonth} onChange={e => setFormData({...formData, endMonth: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold">
                      {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">End Year</label>
                    <select value={formData.endYear} onChange={e => setFormData({...formData, endYear: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold">
                      {[...Array(10)].map((_, i) => {
                        const year = new Date().getFullYear() + i;
                        return <option key={year} value={year}>{year}</option>;
                      })}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Auto-Deduct From</label>
                <select value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold">
                    <option value="">Manual / No Account</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>

              <button type="submit" className="w-full py-4 mt-2 bg-blue-600 text-white font-black rounded-3xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all">
                {editingSub ? "Update Subscription" : "Create Subscription"}
              </button>
          </form>
      </Modal>
    </motion.main>
  );
}

function SubscriptionRow({ sub, accounts, onEdit, onToggle, onDelete }: any) {
    return (
        <div className={cn(
            "bg-white dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm transition-all", 
            !sub.isActive && "opacity-40 grayscale"
        )}>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center font-black text-white dark:text-slate-900 shadow-xl shadow-slate-900/10">
                        {sub.name[0].toUpperCase()}
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1">
                            {sub.type === "emi" ? "Installment / Loan" : "Monthly Service"}
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                            {sub.name}
                        </h4>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tight mt-0.5">
                            Billed Day {sub.dayOfMonth} • {accounts.find((a: any) => a.id === sub.accountId)?.name || "External Account"}
                        </p>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                    <div className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white"><Amount value={sub.amount} /></div>
                    <div className="flex gap-4">
                        <button onClick={onToggle} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">{sub.isActive ? "Pause" : "Resume"}</button>
                        <button onClick={onEdit} className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors">Modify</button>
                        <button onClick={() => window.confirm("Archive this subscription?") && onDelete()} className="text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-rose-600 transition-colors">Remove</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
