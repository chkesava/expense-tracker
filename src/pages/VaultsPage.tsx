import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Shield, Globe, Lock, ArrowRight, Wallet, Target, Info } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import { useVaults } from "../hooks/useVaults";
import { useVaultExpenses } from "../hooks/useVaultExpenses";
import type { SharedVault } from "../types/vault";
import Modal from "../components/common/Modal";
import { cn } from "../lib/utils";
import Amount from "../components/common/Amount";

export default function VaultsPage() {
  const { vaults, loading, createVault } = useVaults();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newVault, setNewVault] = useState({ name: "", budget: 10000, themeColor: "#3b82f6" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createVault({
        name: newVault.name,
        budget: newVault.budget,
        themeColor: newVault.themeColor,
        currency: "INR"
    });
    setIsCreateOpen(false);
    setNewVault({ name: "", budget: 10000, themeColor: "#3b82f6" });
  };

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-6xl px-4 pb-32 pt-24 md:px-6"
    >
      <PageHeader 
        title="Shared Vaults" 
        subtitle="Collaborative budgeting for groups and goals."
        icon={<Users size={24} />}
        rightElement={
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl shadow-xl active:scale-95 transition-all"
          >
            <Plus size={18} />
            <span>Create Vault</span>
          </button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse" />)}
        </div>
      ) : vaults.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-3xl flex items-center justify-center text-slate-400 mb-6 border border-dashed border-slate-300 dark:border-slate-800">
                <Users size={40} />
            </div>
            <h3 className="text-xl font-bold mb-2">No Shared Vaults yet</h3>
            <p className="text-slate-500 max-w-xs mx-auto mb-8">
                Create a vault to track shared expenses with roommates, partners, or travel groups.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                <FeatureCard 
                    icon={<Shield size={20} />} 
                    title="Joint Security" 
                    desc="Encrypted shared state for all members."
                />
                <FeatureCard 
                    icon={<Globe size={20} />} 
                    title="Real-time Sync" 
                    desc="Everyone sees updates instantly."
                />
                <FeatureCard 
                    icon={<Lock size={20} />} 
                    title="Strict Budgets" 
                    desc="Define limits that actually work."
                />
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vaults.map(vault => (
                <VaultCard key={vault.id} vault={vault} />
            ))}
        </div>
      )}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Shared Vault">
          <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vault Name</label>
                  <input 
                    required
                    type="text"
                    value={newVault.name}
                    onChange={e => setNewVault({...newVault, name: e.target.value})}
                    placeholder="Roommates, Trip to Bali, etc."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 font-bold focus:outline-none focus:border-blue-500"
                  />
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Monthly Budget (₹)</label>
                  <input 
                    required
                    type="number"
                    value={newVault.budget}
                    onChange={e => setNewVault({...newVault, budget: Number(e.target.value)})}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 font-bold focus:outline-none focus:border-blue-500"
                  />
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Theme Color</label>
                  <div className="flex flex-wrap gap-3">
                      {colors.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewVault({...newVault, themeColor: c})}
                            className={cn(
                                "w-10 h-10 rounded-full border-4 transition-all",
                                newVault.themeColor === c ? "border-slate-900 dark:border-white scale-110" : "border-transparent"
                            )}
                            style={{ backgroundColor: c }}
                          />
                      ))}
                  </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl shadow-xl hover:opacity-90 transition-all"
              >
                  Initialize Vault
              </button>
          </form>
      </Modal>
    </motion.main>
  );
}

function VaultCard({ vault }: { vault: SharedVault }) {
    const navigate = useNavigate();
    const { expenses } = useVaultExpenses(vault.id);
    
    const totalSaved = expenses.reduce((sum, expense) => expense.type === "deposit" ? sum + (Number(expense.amount) || 0) : sum - (Number(expense.amount) || 0), 0);
    const progress = Math.min(100, vault.budget > 0 ? (totalSaved / vault.budget) * 100 : 0);

    return (
        <motion.div 
            whileHover={{ y: -5 }}
            className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition-all"
        >
            <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full blur-3xl opacity-20" style={{ backgroundColor: vault.themeColor }} />
            
            <div className="relative z-10 space-y-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: vault.themeColor }}>
                            <Wallet size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{vault.name}</h3>
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <Users size={10} />
                            <span>{vault.memberIds.length} Members</span>
                          </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <span>Saved progress</span>
                        <div className="flex items-center gap-1">
                            <Target size={10} />
                            <Amount value={vault.budget} />
                        </div>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted relative">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="absolute left-0 top-0 h-full rounded-full"
                            style={{ backgroundColor: vault.themeColor }}
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button 
                        onClick={() => navigate(`/vaults/${vault.id}`)}
                        className="group/btn flex w-full items-center justify-between rounded-2xl bg-muted/50 px-4 py-3 transition-colors hover:bg-muted"
                    >
                        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">View details</span>
                        <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function FeatureCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="rounded-3xl border border-border bg-card p-6 text-left">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {icon}
            </div>
            <h4 className="mb-1 font-semibold text-foreground">{title}</h4>
            <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
        </div>
    );
}
