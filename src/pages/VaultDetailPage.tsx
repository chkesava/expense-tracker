import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Plus, Settings, Trash2, Users, Wallet, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import Amount from "../components/common/Amount";
import Modal from "../components/common/Modal";
import { Skeleton } from "../components/common/Skeleton";
import Avatar from "../components/Avatar";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { useUsers } from "../hooks/useUsers";
import { useUserProfilesByIds } from "../hooks/useUserProfilesByIds";
import { useVaultExpenses } from "../hooks/useVaultExpenses";
import { useVaults } from "../hooks/useVaults";
import { todayDateKey } from "../utils/dates";
import { toast } from "react-toastify";
import type { VaultExpense } from "../types/vaultExpense";
import type { UserProfile } from "../hooks/useUsers";

export default function VaultDetailPage() {
  const { vaultId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { vaults, loading: vaultsLoading, inviteMember } = useVaults();
  const { searchUsers, loading: usersSearching } = useUsers();
  const { expenses: vaultExpenses, loading: expensesLoading, addVaultExpense, deleteVaultExpense } =
    useVaultExpenses(vaultId);

  const vault = useMemo(() => vaults.find((v) => v.id === vaultId), [vaults, vaultId]);
  const { profiles: memberProfiles } = useUserProfilesByIds(vault?.memberIds ?? []);

  const totalSaved = useMemo(() => {
    return vaultExpenses.reduce((sum, e) => {
      const amt = Number(e.amount) || 0;
      return e.type === "deposit" ? sum + amt : sum - amt;
    }, 0);
  }, [vaultExpenses]);

  const progress = vault && vault.budget > 0 ? Math.min(100, Math.max(0, (totalSaved / vault.budget) * 100)) : 0;

  const memberContributions = useMemo(() => {
    if (!vault) return [];
    const memberIds = vault.memberIds;
    const contributedMap: Record<string, number> = Object.fromEntries(memberIds.map((id) => [id, 0]));
    
    for (const e of vaultExpenses) {
      if (e.type === "deposit") {
        contributedMap[e.createdBy] = (contributedMap[e.createdBy] ?? 0) + (Number(e.amount) || 0);
      }
    }

    return memberIds.map((uid) => ({
      uid,
      contributed: contributedMap[uid] ?? 0,
    })).sort((a, b) => b.contributed - a.contributed);
  }, [vault, vaultExpenses]);

  const stats = useMemo(() => {
    let depositCount = 0;
    let withdrawalCount = 0;
    let totalDeposited = 0;
    let totalWithdrawn = 0;

    for (const e of vaultExpenses) {
      const amt = Number(e.amount) || 0;
      if (e.type === "deposit") {
        depositCount++;
        totalDeposited += amt;
      } else {
        withdrawalCount++;
        totalWithdrawn += amt;
      }
    }

    return {
      depositCount,
      withdrawalCount,
      totalDeposited,
      totalWithdrawn,
      targetRemaining: vault ? Math.max(0, vault.budget - totalSaved) : 0,
    };
  }, [vault, vaultExpenses, totalSaved]);

  const memberOptions = useMemo(() => {
    if (!vault) return [];
    return vault.memberIds.map((uid) => ({
      uid,
      name: memberProfiles[uid]?.displayName || "Member",
      email: memberProfiles[uid]?.email || "",
      photoURL: memberProfiles[uid]?.photoURL,
    }));
  }, [vault, memberProfiles]);

  const [isVaultSettingsOpen, setIsVaultSettingsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<UserProfile[]>([]);

  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState<{
    amount: number;
    type: "deposit" | "withdrawal";
    note: string;
    date: string;
  }>({
    amount: 0,
    type: "deposit",
    note: "",
    date: todayDateKey(),
  });

  const runInviteSearch = async () => {
    const results = await searchUsers(inviteQuery.trim());
    setInviteResults(results);
  };

  if (vaultsLoading && !vault) {
    return (
      <div className="p-20 text-center">
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="p-20 text-center">
        <h2 className="text-xl font-bold">Vault not found</h2>
        <button onClick={() => navigate("/vaults")} className="mt-4 text-blue-600 font-bold">
          Back to Vaults
        </button>
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

        <button
          onClick={() => setIsVaultSettingsOpen(true)}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          aria-label="Vault settings"
        >
          <Settings size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-xl relative overflow-hidden">
            <div
              className="absolute -right-4 -top-4 h-32 w-32 rounded-full blur-3xl opacity-20"
              style={{ backgroundColor: vault.themeColor }}
            />

            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: vault.themeColor }}
                >
                  <Wallet size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black">{vault.name}</h2>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Savings Vault
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Total Saved
                    </span>
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      <Amount value={totalSaved} />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Target Goal
                    </span>
                    <div className="text-sm font-black text-slate-600 dark:text-slate-300">
                      <Amount value={vault.budget} />
                    </div>
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
                    <span>{Math.round(progress)}% of target</span>
                    <span>
                      {totalSaved >= vault.budget ? "Goal Met!" : <><Amount value={stats.targetRemaining} /> left</>}
                    </span>
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
              {memberOptions.map((m) => (
                <div key={m.uid} className="relative group" title={m.name}>
                  <Avatar size={36} src={m.photoURL} name={m.name} />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                </div>
              ))}
              <button
                onClick={() => setIsInviteOpen(true)}
                className="w-9 h-9 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all"
                aria-label="Add member"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Vault Activity</h3>
            <button
              onClick={() => {
                setNewTransaction({
                  amount: 0,
                  type: "deposit",
                  note: "",
                  date: todayDateKey(),
                });
                setIsAddTransactionOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest shadow-md"
            >
              <Plus size={14} />
              <span>Contribute</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                Deposits by Member
              </div>
              <div className="space-y-3">
                {memberContributions.map((m) => {
                  const profile = memberProfiles[m.uid];
                  const name = profile?.displayName || "Member";
                  return (
                    <div key={m.uid} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar size={30} src={profile?.photoURL} name={name} />
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">{name}</div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Partner
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        <Amount value={m.contributed} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                Piggy Bank Stats
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500">Deposits Count:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{stats.depositCount}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500">Withdrawals Count:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{stats.withdrawalCount}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500">Gross Deposited:</span>
                  <span className="font-black text-emerald-600"><Amount value={stats.totalDeposited} /></span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500">Gross Withdrawn:</span>
                  <span className="font-black text-rose-500"><Amount value={stats.totalWithdrawn} /></span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {expensesLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
            ) : vaultExpenses.length === 0 ? (
              <div className="p-12 text-center rounded-[2rem] bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800">
                <Clock className="mx-auto text-slate-300 mb-4" size={32} />
                <p className="text-slate-400 font-bold">No contributions to this vault yet.</p>
              </div>
            ) : (
              vaultExpenses.map((expense) => {
                const isDeposit = expense.type === "deposit";
                const profile = memberProfiles[expense.createdBy];
                const authorName = profile?.displayName || "Member";
                return (
                  <div
                    key={expense.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-white",
                        isDeposit ? "bg-emerald-500" : "bg-rose-500"
                      )}>
                        {isDeposit ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          <span>{isDeposit ? "Deposit" : "Withdrawal"}</span>
                          <span className="text-[10px] font-black uppercase text-slate-400">
                            • by {authorName}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">
                          {expense.date} • {expense.note || "No details"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={cn("font-black text-sm", isDeposit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500")}>
                          {isDeposit ? "+" : "-"}<Amount value={expense.amount} />
                        </div>
                      </div>
                      <button
                        onClick={() => expense.id && deleteVaultExpense(expense.id)}
                        className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        aria-label="Delete transaction"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Add members">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Search user</label>
            <div className="flex gap-2">
              <input
                value={inviteQuery}
                onChange={(e) => setInviteQuery(e.target.value)}
                placeholder="Email, username or name"
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={runInviteSearch}
                disabled={usersSearching || inviteQuery.trim().length < 2}
                className="px-5 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black disabled:opacity-50"
              >
                Search
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {inviteResults.length === 0 ? (
              <div className="text-sm font-bold text-slate-400">No results yet.</div>
            ) : (
              inviteResults
                .filter((u) => !vault.memberIds.includes(u.uid))
                .map((u) => (
                  <button
                    key={u.uid}
                    onClick={async () => {
                      await inviteMember(vault.id!, u.uid);
                      setIsInviteOpen(false);
                      setInviteQuery("");
                      setInviteResults([]);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/40 dark:border-white/5 hover:bg-white dark:hover:bg-slate-900 transition-all text-left"
                  >
                    <Avatar size={40} src={u.photoURL} name={u.displayName || u.email || "User"} />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold truncate">{u.displayName || "Anonymous"}</div>
                      <div className="text-xs text-slate-500 truncate">{u.email}</div>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-blue-600">Add</span>
                  </button>
                ))
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={isAddTransactionOpen} onClose={() => setIsAddTransactionOpen(false)} title="New Contribution">
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (newTransaction.amount <= 0) return toast.error("Please enter a valid amount");
            await addVaultExpense({
              vaultId: vault.id!,
              amount: Number(newTransaction.amount),
              type: newTransaction.type,
              note: newTransaction.note.trim() || (newTransaction.type === "deposit" ? "Savings deposit" : "Savings withdrawal"),
              date: newTransaction.date,
              paidBy: user?.uid ?? "", // kept for type compatibility if needed
              splitBetween: [], // kept empty to signal non-expense goal contributions
            } as any);
            setIsAddTransactionOpen(false);
            setNewTransaction({ amount: 0, type: "deposit", note: "", date: todayDateKey() });
          }}
        >
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Type</label>
            <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setNewTransaction((p) => ({ ...p, type: "deposit" }))}
                className={cn(
                  "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                  newTransaction.type === "deposit"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Deposit
              </button>
              <button
                type="button"
                onClick={() => setNewTransaction((p) => ({ ...p, type: "withdrawal" }))}
                className={cn(
                  "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                  newTransaction.type === "withdrawal"
                    ? "bg-white dark:bg-slate-900 text-rose-500 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Withdrawal
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount</label>
              <input
                required
                type="number"
                min={0.01}
                step="0.01"
                value={newTransaction.amount || ""}
                onChange={(e) => setNewTransaction((p) => ({ ...p, amount: Number(e.target.value) }))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500"
                placeholder="₹0.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date</label>
              <input
                required
                type="date"
                value={newTransaction.date}
                onChange={(e) => setNewTransaction((p) => ({ ...p, date: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Note / Description</label>
            <input
              value={newTransaction.note}
              onChange={(e) => setNewTransaction((p) => ({ ...p, note: e.target.value }))}
              placeholder="e.g. Monthly contribution, Trip deposits"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl shadow-xl hover:opacity-90 transition-all"
          >
            Save Transaction
          </button>
        </form>
      </Modal>

      <Modal isOpen={isVaultSettingsOpen} onClose={() => setIsVaultSettingsOpen(false)} title="Vault settings">
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-200">
          <div className="font-bold">Settings config</div>
          <div className="text-xs text-slate-500">
            Edit target budget limit: <Amount value={vault.budget} />
          </div>
        </div>
      </Modal>
    </motion.main>
  );
}
