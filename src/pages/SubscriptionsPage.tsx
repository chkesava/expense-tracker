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
import type { Subscription } from "../types/subscription";
import Modal from "../components/common/Modal";
import { Skeleton } from "../components/common/Skeleton";
import PageHeader from "../components/layout/PageHeader";

type SubTab = "recurring" | "travel" | "stats";

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const { subscriptions, loading, addSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
  const { trips, loading: tripsLoading } = useTrips();
  const { accounts } = useAccounts();
  
  const [activeTab, setActiveTab] = useState<SubTab>("recurring");
  const [isAddingSub, setIsAddingSub] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    category: "Subscriptions",
    day: "1",
    accountId: "",
    type: "subscription" as "subscription" | "emi",
    endMonth: (new Date().getMonth() + 1).toString(),
    endYear: new Date().getFullYear().toString()
  });
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
    { id: "travel", label: "Travel", icon: <Plane size={16} /> },
    { id: "stats", label: "Stats", icon: <Activity size={16} /> },
  ];

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl px-4 pb-32 pt-24">
      <PageHeader 
        title="Planning Hub" 
        subtitle="Manage subscriptions and travel budgets."
        icon={<Calendar size={24} />}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        rightElement={
            <button
                onClick={() => activeTab === "recurring" ? setIsAddingSub(true) : navigate("/travel/new")}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
                <Plus size={18} />
                <span>New {activeTab === "recurring" ? "Bill" : "Trip"}</span>
            </button>
        }
      />

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            
            {activeTab === "recurring" && (
                <div className="space-y-4">
                    {loading ? <Skeleton className="h-48 w-full" /> : (
                        subscriptions.length === 0 ? (
                            <div className="py-20 text-center text-slate-400 bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] border border-dashed border-white/60 dark:border-slate-800/60">
                                <CreditCard size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-bold">No active subscriptions</p>
                            </div>
                        ) : (
                            subscriptions.map(sub => (
                                <SubscriptionRow key={sub.id} sub={sub} accounts={accounts} onEdit={handleEdit} onToggle={() => updateSubscription(sub.id!, { isActive: !sub.isActive })} onDelete={() => deleteSubscription(sub.id!)} />
                            ))
                        )
                    )}
                </div>
            )}

            {activeTab === "travel" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tripsLoading ? <Skeleton className="h-48 w-full" /> : (
                        trips.length === 0 ? (
                            <div className="col-span-full py-20 text-center text-slate-400 bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] border border-dashed border-white/60 dark:border-slate-800/60">
                                <Plane size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-bold">No upcoming trips</p>
                            </div>
                        ) : (
                            trips.map(trip => (
                                <div key={trip.id} onClick={() => navigate(`/travel/${trip.id}`)} className="bg-white/80 dark:bg-slate-900/80 p-6 rounded-[2.5rem] border border-white/20 shadow-sm cursor-pointer hover:scale-[1.02] transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-black">{trip.destination}</h3>
                                        <div className="text-right">
                                            <div className="text-lg font-black">₹{trip.spentAmount.toLocaleString()}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">Budget: ₹{trip.totalBudget.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className={cn("h-full transition-all duration-1000", (trip.spentAmount/trip.totalBudget) > 1 ? "bg-rose-500" : "bg-blue-600")} style={{ width: `${Math.min((trip.spentAmount/trip.totalBudget)*100, 100)}%` }} />
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>
            )}

            {activeTab === "stats" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] border border-white/10 shadow-xl">
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Monthly Burden</div>
                        <div className="text-3xl font-black">₹{stats.totalMonthly.toLocaleString()}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-white/20">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Active Subs</div>
                        <div className="text-3xl font-black">{stats.subCount}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-white/20">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Active EMIs</div>
                        <div className="text-3xl font-black">{stats.emiCount}</div>
                    </div>
                </div>
            )}

        </motion.div>
      </AnimatePresence>

      <Modal isOpen={isAddingSub} onClose={() => { setIsAddingSub(false); setEditingSub(null); }} title={editingSub ? "Modify Bill" : "Launch Bill"}>
          <form onSubmit={handleSubSubmit} className="space-y-4">
              <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Service Name" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold" />
              <div className="grid grid-cols-2 gap-4">
                  <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="Amount" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold" />
                  <select value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold">
                    {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>Day {i+1}</option>)}
                  </select>
              </div>
              <select value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold">
                  <option value="">No Auto-Account</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
              <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-3xl shadow-lg">Commit Expense</button>
          </form>
      </Modal>
    </motion.main>
  );
}

function SubscriptionRow({ sub, accounts, onEdit, onToggle, onDelete }: any) {
    return (
        <div className={cn("bg-white/80 dark:bg-slate-900/80 p-5 rounded-[2rem] border border-white/20 shadow-sm transition-all", !sub.isActive && "opacity-50 grayscale")}>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-blue-600 shadow-sm">{sub.name[0].toUpperCase()}</div>
                    <div>
                        <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                            {sub.name}
                            <span className="text-[8px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 tracking-widest uppercase">{sub.type || "sub"}</span>
                        </h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Day {sub.dayOfMonth} • {accounts.find((a: any) => a.id === sub.accountId)?.name || "Manual"}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xl font-black">₹{sub.amount.toLocaleString()}</div>
                    <div className="flex gap-2 mt-2">
                        <button onClick={onToggle} className="text-[9px] font-black uppercase text-amber-600">{sub.isActive ? "Pause" : "Resume"}</button>
                        <button onClick={onEdit} className="text-[9px] font-black uppercase text-blue-500">Edit</button>
                        <button onClick={() => window.confirm("Delete?") && onDelete()} className="text-[9px] font-black uppercase text-rose-500">Del</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
