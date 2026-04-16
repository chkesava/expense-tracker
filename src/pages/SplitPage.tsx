import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSplits } from "../hooks/useSplits";
import { useAuth } from "../hooks/useAuth";
import { useUsers } from "../hooks/useUsers";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Plus, 
  TrendingUp,
  Receipt,
  History,
  Info,
  ChevronRight,
  CheckCircle2,
  Clock,
  Trash2,
  Settings2,
  LayoutGrid,
  IndianRupee,
  ChevronDown,
  Loader2
} from "lucide-react";
import { cn } from "../lib/utils";
import PageHeader from "../components/layout/PageHeader";
import Avatar from "../components/Avatar";
import { CATEGORIES } from "../types/expense";
import type { Participant } from "../types/split";
import type { UserProfile } from "../hooks/useUsers";

type SplitTab = "activity" | "management";

export default function SplitPage() {
  const { splits, loading, createSplit } = useSplits();
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<SplitTab>(() => {
    if (location.state?.tab) return location.state.tab as SplitTab;
    return "activity";
  });
  const [activityFilter, setActivityFilter] = useState<"active" | "settled">("active");

  // Create Split State (Consolidated)
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [category, setCategory] = useState("Other");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const { searchUsers, loading: searchLoading } = useUsers();
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);

  // Initialize Create Form
  useEffect(() => {
    if (user && participants.length === 0) {
      setParticipants([{ name: "You", amount: 0, paid: true, isCurrentUser: true, userId: user.uid }]);
    }
  }, [user]);

  // Recalculate Split
  useEffect(() => {
    if (splitType === "equal" && totalAmount && participants.length > 0) {
      const amountPerPerson = Number(totalAmount) / participants.length;
      setParticipants(prev => prev.map(p => ({ ...p, amount: amountPerPerson })));
    }
  }, [totalAmount, participants.length, splitType]);

  const summary = useMemo(() => {
    if (!user) return { toReceive: 0, toPay: 0 };
    return splits.reduce((acc, split) => {
      if (split.settled) return acc;
      split.participants.forEach(p => {
        if (p.paid) return;
        if (split.createdBy === user.uid) {
          if (p.userId !== user.uid) acc.toReceive += p.amount;
        } else if (p.userId === user.uid) {
          acc.toPay += p.amount;
        }
      });
      return acc;
    }, { toReceive: 0, toPay: 0 });
  }, [splits, user]);

  const filteredSplits = splits.filter(s => activityFilter === "active" ? !s.settled : s.settled);

  const handleCreateSubmit = async (e: any) => {
    e.preventDefault();
    try {
        await createSplit({
            title,
            totalAmount: Number(totalAmount),
            splitType,
            category,
            participants: participants.map(p => ({ ...p, amount: Number(p.amount) })),
            participantIds: participants.map(p => p.userId).filter((id): id is string => !!id)
        });
        setActiveTab("activity");
        setTitle(""); setTotalAmount(""); setParticipants([{ name: "You", amount: 0, paid: true, isCurrentUser: true, userId: user!.uid }]);
    } catch (err) { console.error(err); }
  };

  const tabs = [
    { id: "activity", label: "Activity", icon: <History size={16} /> },
    { id: "management", label: "New Split", icon: <Plus size={16} /> },
  ];

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 pt-24 pb-32">
      <PageHeader 
        title="Split Hub" 
        subtitle="Manage shared expenses and balances."
        icon={<Users size={24} />}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            
            {activeTab === "activity" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <section className="bg-white/80 dark:bg-slate-900/80 p-6 rounded-3xl border border-white/20 shadow-sm backdrop-blur-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"><TrendingUp size={20} /></div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">To Receive</h3>
                            </div>
                            <div className="text-2xl font-black">₹{summary.toReceive.toLocaleString()}</div>
                        </section>
                        <section className="bg-white/80 dark:bg-slate-900/80 p-6 rounded-3xl border border-white/20 shadow-sm backdrop-blur-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600"><Receipt size={20} /></div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">To Pay</h3>
                            </div>
                            <div className="text-2xl font-black">₹{summary.toPay.toLocaleString()}</div>
                        </section>
                    </div>

                    <div className="rounded-[2.5rem] bg-white/50 dark:bg-slate-900/50 border border-white/20 shadow-sm overflow-hidden">
                        <div className="flex p-4 border-b border-slate-100 dark:border-slate-800 justify-between items-center">
                            <div className="flex gap-2">
                                {["active", "settled"].map((f: any) => (
                                    <button 
                                        key={f} 
                                        onClick={() => setActivityFilter(f)}
                                        className={cn("px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", activityFilter === f ? "bg-slate-900 text-white dark:bg-blue-600" : "text-slate-400 hover:text-slate-600")}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredSplits.length === 0 ? (
                                <div className="py-20 text-center text-slate-400 italic text-sm">No {activityFilter} splits found</div>
                            ) : (
                                filteredSplits.map(s => (
                                    <Link key={s.id} to={`/split/${s.id}`} className="flex items-center justify-between p-4 hover:bg-white/50 dark:hover:bg-slate-950/40 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className={cn("p-2.5 rounded-2xl", s.settled ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600")}>
                                                {s.settled ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600">{s.title}</div>
                                                <div className="text-[10px] text-slate-400 font-medium">₹{s.totalAmount.toLocaleString()} • {s.participants.length} members</div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-300" />
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "management" && (
                <section className="bg-white/80 dark:bg-slate-900/80 p-8 rounded-[2.5rem] border border-white/20 shadow-xl backdrop-blur-xl">
                    <form onSubmit={handleCreateSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Event Title</label>
                                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Weekend Trip" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Total Bill</label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Participants</h4>
                                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                    <button type="button" onClick={() => setSplitType("equal")} className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all", splitType === "equal" ? "bg-white text-blue-600" : "text-slate-400")}>Equal</button>
                                    <button type="button" onClick={() => setSplitType("custom")} className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all", splitType === "custom" ? "bg-white text-blue-600" : "text-slate-400")}>Custom</button>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                {participants.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl relative">
                                        <div className="flex-1">
                                            <input 
                                                value={p.name} 
                                                onChange={e => {
                                                    const next = [...participants];
                                                    next[idx].name = e.target.value;
                                                    setParticipants(next);
                                                    if (e.target.value.length > 2) {
                                                        setActiveSearchIndex(idx);
                                                        searchUsers(e.target.value).then(setSearchResults);
                                                    } else {
                                                        setSearchResults([]);
                                                    }
                                                }}
                                                disabled={p.isCurrentUser}
                                                placeholder="Friend's Name" 
                                                className="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0" 
                                            />
                                            {activeSearchIndex === idx && searchResults.length > 0 && (
                                                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                                                    {searchResults.map(res => (
                                                        <div key={res.uid} onClick={() => {
                                                            const next = [...participants];
                                                            next[idx].name = res.displayName;
                                                            next[idx].userId = res.uid;
                                                            next[idx].photoURL = res.photoURL;
                                                            setParticipants(next);
                                                            setSearchResults([]);
                                                            setActiveSearchIndex(null);
                                                        }} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer">
                                                            <Avatar name={res.displayName} src={res.photoURL} size={24} />
                                                            <span className="text-xs font-bold">{res.displayName}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-24">
                                            <input 
                                                type="number" 
                                                value={p.amount || ""} 
                                                onChange={e => {
                                                    const next = [...participants];
                                                    next[idx].amount = Number(e.target.value);
                                                    setParticipants(next);
                                                }}
                                                disabled={splitType === "equal"}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 text-xs font-black text-right" 
                                            />
                                        </div>
                                        {!p.isCurrentUser && (
                                            <button type="button" onClick={() => setParticipants(prev => prev.filter((_, i) => i !== idx))} className="text-rose-500 hover:text-rose-700 transition-colors"><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={() => setParticipants([...participants, { name: "", amount: 0, paid: false, isCurrentUser: false }])} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:text-blue-500 hover:border-blue-500/40 transition-all">+ Add Member</button>
                            </div>
                        </div>

                        <button type="submit" className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white font-black rounded-3xl shadow-xl hover:scale-[1.01] transition-all">Establish Split</button>
                    </form>
                </section>
            )}

        </motion.div>
      </AnimatePresence>
    </motion.main>
  );
}
