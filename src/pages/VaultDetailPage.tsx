import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Users, 
    ArrowLeft, 
    Settings, 
    Plus, 
    Target, 
    Wallet, 
    TrendingUp,
    Share2,
    CheckCircle2,
    Clock,
    MoreVertical
} from "lucide-react";
import { useVaults } from "../hooks/useVaults";
import type { SharedVault } from "../types/vault";
import { useExpenses } from "../hooks/useExpenses";
import PageHeader from "../components/layout/PageHeader";
import Amount from "../components/common/Amount";
import Avatar from "../components/Avatar";
import { cn } from "../lib/utils";
import { Skeleton } from "../components/common/Skeleton";

export default function VaultDetailPage() {
  const { vaultId } = useParams();
  const navigate = useNavigate();
  const { vaults, loading: vaultsLoading, inviteMember } = useVaults();
  const { expenses, loading: expensesLoading } = useExpenses();
  
  const vault = useMemo(() => vaults.find(v => v.id === vaultId), [vaults, vaultId]);
  
  const vaultExpenses = useMemo(() => {
    return expenses.filter(e => e.vaultId === vaultId);
  }, [expenses, vaultId]);

  const totalSpent = useMemo(() => {
    return vaultExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [vaultExpenses]);

  const progress = vault ? Math.min(100, (totalSpent / vault.budget) * 100) : 0;

  if (vaultsLoading && !vault) {
    return <div className="p-20 text-center"><Skeleton className="h-40 w-full rounded-3xl" /></div>;
  }

  if (!vault) {
    return (
        <div className="p-20 text-center">
            <h2 className="text-xl font-bold">Vault not found</h2>
            <button onClick={() => navigate("/vaults")} className="mt-4 text-blue-600 font-bold">Back to Vaults</button>
        </div>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-6xl px-4 pb-32 pt-24 md:px-6"
    >
      <div className="mb-8 flex items-center justify-between">
          <button 
            onClick={() => navigate("/vaults")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
              <ArrowLeft size={18} />
              <span className="text-sm font-black uppercase tracking-widest">Back to Vaults</span>
          </button>
          
          <button className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <Settings size={18} />
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Stats & Progress */}
          <div className="lg:col-span-1 space-y-6">
              <div className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-xl relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full blur-3xl opacity-20" style={{ backgroundColor: vault.themeColor }} />
                  
                  <div className="relative z-10 space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: vault.themeColor }}>
                            <Wallet size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black">{vault.name}</h2>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Joint Account</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                          <div className="flex items-end justify-between">
                              <div className="space-y-1">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Spent</span>
                                  <div className="text-3xl font-black"><Amount value={totalSpent} /></div>
                              </div>
                              <div className="text-right">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Limit</span>
                                  <div className="text-sm font-black text-slate-600 dark:text-slate-300"><Amount value={vault.budget} /></div>
                              </div>
                          </div>
                          
                          <div className="space-y-2">
                              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: vault.themeColor }}
                                  />
                              </div>
                              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  <span>{Math.round(progress)}% of budget</span>
                                  <span><Amount value={vault.budget - totalSpent} /> left</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="p-6 rounded-[2rem] bg-white/50 dark:bg-slate-900/50 border border-white dark:border-white/5 backdrop-blur-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                      <Users size={14} />
                      <span>Members ({vault.memberIds.length})</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                      {vault.memberIds.map((id, i) => (
                          <div key={id} className="relative group">
                              <Avatar size={36} src={undefined} name={`Member ${i+1}`} />
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                          </div>
                      ))}
                      <button 
                        onClick={() => inviteMember(vault.id!, "")} // Placeholder for invite UI
                        className="w-9 h-9 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all"
                      >
                          <Plus size={16} />
                      </button>
                  </div>
              </div>
          </div>

          {/* Right Column: Activity */}
          <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Vault Activity</h3>
                  <div className="flex gap-2">
                      <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest">
                          <Plus size={14} />
                          <span>Record</span>
                      </button>
                  </div>
              </div>

              <div className="space-y-4">
                  {expensesLoading ? (
                      [1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
                  ) : vaultExpenses.length === 0 ? (
                      <div className="p-12 text-center rounded-[2rem] bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800">
                          <Clock className="mx-auto text-slate-300 mb-4" size={32} />
                          <p className="text-slate-400 font-bold">No transactions in this vault yet.</p>
                      </div>
                  ) : (
                      vaultExpenses.map(expense => (
                          <div key={expense.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 flex items-center justify-between group">
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black uppercase">
                                      {expense.category[0]}
                                  </div>
                                  <div>
                                      <div className="text-sm font-bold">{expense.category}</div>
                                      <div className="text-[10px] text-slate-400 font-bold uppercase">{expense.date} • {expense.note || "No note"}</div>
                                  </div>
                              </div>
                              <div className="flex items-center gap-4">
                                  <div className="text-right">
                                      <div className="font-black text-rose-500 text-sm">-<Amount value={expense.amount} /></div>
                                  </div>
                                  <button className="p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <MoreVertical size={14} className="text-slate-400" />
                                  </button>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </div>
    </motion.main>
  );
}
