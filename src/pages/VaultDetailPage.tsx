import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Copy, Plus, QrCode, Settings, Smartphone, Trash2, Users, Wallet } from "lucide-react";
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
import useSettings from "../hooks/useSettings";
import { generateUpiLink, isMobile } from "../utils/upi";
import { toast } from "react-toastify";
import { QRCodeSVG } from "qrcode.react";
import type { VaultExpense } from "../types/vaultExpense";
import type { UserProfile } from "../hooks/useUsers";

export default function VaultDetailPage() {
  const { vaultId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { vaults, loading: vaultsLoading, inviteMember } = useVaults();
  const { searchUsers, loading: usersSearching } = useUsers();
  const { expenses: vaultExpenses, loading: expensesLoading, addVaultExpense, deleteVaultExpense } =
    useVaultExpenses(vaultId);

  const vault = useMemo(() => vaults.find((v) => v.id === vaultId), [vaults, vaultId]);
  const { profiles: memberProfiles } = useUserProfilesByIds(vault?.memberIds ?? []);

  const totalSpent = useMemo(
    () => vaultExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0),
    [vaultExpenses]
  );

  const progress = vault ? Math.min(100, (totalSpent / vault.budget) * 100) : 0;

  const balances = useMemo(() => {
    if (!vault) return [];
    const memberIds = vault.memberIds;
    const spentBy: Record<string, number> = Object.fromEntries(memberIds.map((id) => [id, 0]));
    const owedBy: Record<string, number> = Object.fromEntries(memberIds.map((id) => [id, 0]));

    for (const expense of vaultExpenses) {
      const splitBetween = expense.splitBetween?.length ? expense.splitBetween : memberIds;
      const share = splitBetween.length > 0 ? expense.amount / splitBetween.length : 0;
      spentBy[expense.paidBy] = (spentBy[expense.paidBy] ?? 0) + expense.amount;
      for (const uid of splitBetween) owedBy[uid] = (owedBy[uid] ?? 0) + share;
    }

    return memberIds.map((uid) => {
      const spent = spentBy[uid] ?? 0;
      const owed = owedBy[uid] ?? 0;
      const net = spent - owed;
      return { uid, spent, owed, net };
    });
  }, [vault, vaultExpenses]);

  const settlements = useMemo(() => {
    const creditors = balances
      .filter((b) => b.net > 0.01)
      .map((b) => ({ uid: b.uid, amount: b.net }))
      .sort((a, b) => b.amount - a.amount);
    const debtors = balances
      .filter((b) => b.net < -0.01)
      .map((b) => ({ uid: b.uid, amount: -b.net }))
      .sort((a, b) => b.amount - a.amount);

    const out: Array<{ from: string; to: string; amount: number }> = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].amount, creditors[j].amount);
      out.push({ from: debtors[i].uid, to: creditors[j].uid, amount: pay });
      debtors[i].amount -= pay;
      creditors[j].amount -= pay;
      if (debtors[i].amount <= 0.01) i++;
      if (creditors[j].amount <= 0.01) j++;
    }
    return out;
  }, [balances]);

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

  // UPI payment state
  const [qrData, setQrData] = useState<{ toName: string; amount: number; upiLink: string } | null>(null);

  const handleVaultPay = (toUid: string, amount: number) => {
    const toProfile = memberProfiles[toUid];
    const toName = toProfile?.displayName || "Member";
    // Use creditor's stored UPI ID, else fall back to current user's UPI from settings (shouldn't happen)
    const targetUpi = toProfile?.upiId || settings.upiId || "";
    const upiLink = generateUpiLink(targetUpi, toName, amount, `Vault: ${vault!.name}`);
    if (!upiLink) {
      toast.error(`${toName} hasn't set a UPI ID. Ask them to add it in Settings.`);
      return;
    }
    navigator.clipboard.writeText(upiLink).then(() => {
      if (!isMobile()) toast.success("UPI link copied! Share it to pay.");
    });
    if (isMobile()) window.location.href = upiLink;
  };

  const handleVaultQr = (toUid: string, amount: number) => {
    const toProfile = memberProfiles[toUid];
    const toName = toProfile?.displayName || "Member";
    const targetUpi = toProfile?.upiId || settings.upiId || "";
    const upiLink = generateUpiLink(targetUpi, toName, amount, `Vault: ${vault!.name}`);
    if (!upiLink) {
      toast.error(`${toName} hasn't set a UPI ID. Ask them to add it in Settings.`);
      return;
    }
    setQrData({ toName, amount, upiLink });
  };

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [newExpense, setNewExpense] = useState<
    Pick<VaultExpense, "amount" | "category" | "note" | "date" | "paidBy" | "splitBetween">
  >({
    amount: 0,
    category: "",
    note: "",
    date: new Date().toISOString().slice(0, 10),
    paidBy: user?.uid ?? "",
    splitBetween: vault?.memberIds ?? [],
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
                    Joint Account
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Total Spent
                    </span>
                    <div className="text-3xl font-black">
                      <Amount value={totalSpent} />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Limit
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
                    <span>{Math.round(progress)}% of budget</span>
                    <span>
                      <Amount value={vault.budget - totalSpent} /> left
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
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setNewExpense((prev) => ({
                    ...prev,
                    paidBy: user?.uid ?? vault.ownerId,
                    splitBetween: vault.memberIds,
                    date: new Date().toISOString().slice(0, 10),
                  }));
                  setIsAddExpenseOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest"
              >
                <Plus size={14} />
                <span>Record</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                Member totals
              </div>
              <div className="space-y-3">
                {balances.map((b) => {
                  const profile = memberProfiles[b.uid];
                  const name = profile?.displayName || "Member";
                  return (
                    <div key={b.uid} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar size={30} src={profile?.photoURL} name={name} />
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">{name}</div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Spent <Amount value={b.spent} /> • Owes <Amount value={b.owed} />
                          </div>
                        </div>
                      </div>
                      <div className={cn("text-sm font-black", b.net >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {b.net >= 0 ? "+" : "-"}
                        <Amount value={Math.abs(b.net)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Settle up</div>
              {settlements.length === 0 ? (
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                  <span>✓</span> All settled up!
                </div>
              ) : (
                <div className="space-y-3">
                  {settlements.map((s, idx) => {
                    const from = memberProfiles[s.from]?.displayName || "Member";
                    const to = memberProfiles[s.to]?.displayName || "Member";
                    const isCurrentUserDebtor = s.from === user?.uid;
                    const creditorHasUpi = !!memberProfiles[s.to]?.upiId;
                    return (
                      <div key={idx} className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
                        {/* Settlement info row */}
                        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
                          <div className="text-xs font-bold text-slate-600 dark:text-slate-200 min-w-0">
                            <span className="font-black">{from}</span>
                            <span className="text-slate-400 mx-1">→</span>
                            <span className="font-black">{to}</span>
                          </div>
                          <div className="text-sm font-black text-slate-900 dark:text-white shrink-0">
                            <Amount value={s.amount} />
                          </div>
                        </div>

                        {/* Pay buttons — only shown to the debtor */}
                        {isCurrentUserDebtor && (
                          <div className="flex items-center border-t border-slate-200/60 dark:border-white/5 divide-x divide-slate-200/60 dark:divide-white/5">
                            <button
                              onClick={() => handleVaultPay(s.to, s.amount)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                              title={isMobile() ? "Open UPI App" : "Copy UPI Link"}
                            >
                              {isMobile() ? <Smartphone size={13} /> : <Copy size={13} />}
                              {isMobile() ? "Pay Now" : "Copy Link"}
                            </button>
                            <button
                              onClick={() => handleVaultQr(s.to, s.amount)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                              title="Show QR Code"
                            >
                              <QrCode size={13} />
                              QR Code
                            </button>
                          </div>
                        )}

                        {/* Info when creditor has no UPI */}
                        {isCurrentUserDebtor && !creditorHasUpi && (
                          <div className="px-4 pb-2 text-[10px] text-amber-500 font-bold">
                            ⚠ {to} hasn't added a UPI ID yet
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {expensesLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
            ) : vaultExpenses.length === 0 ? (
              <div className="p-12 text-center rounded-[2rem] bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800">
                <Clock className="mx-auto text-slate-300 mb-4" size={32} />
                <p className="text-slate-400 font-bold">No transactions in this vault yet.</p>
              </div>
            ) : (
              vaultExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black uppercase">
                      {expense.category?.[0] ?? "E"}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{expense.category}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">
                        {expense.date} • {memberProfiles[expense.paidBy]?.displayName || "Member"} paid •{" "}
                        {expense.note || "No note"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-black text-rose-500 text-sm">
                        -<Amount value={expense.amount} />
                      </div>
                    </div>
                    <button
                      onClick={() => expense.id && deleteVaultExpense(expense.id)}
                      className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      aria-label="Delete expense"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
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
            <div className="text-[11px] text-slate-500 font-medium">
              Adds real users from your app (Firestore <code className="font-mono">users</code> collection).
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

      <Modal isOpen={isAddExpenseOpen} onClose={() => setIsAddExpenseOpen(false)} title="Record vault expense">
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newExpense.category.trim()) return;
            if (!newExpense.paidBy) return;
            const splitBetween = newExpense.splitBetween.length ? newExpense.splitBetween : vault.memberIds;
            await addVaultExpense({
              vaultId: vault.id!,
              amount: Number(newExpense.amount),
              category: newExpense.category.trim(),
              note: newExpense.note?.trim() || "",
              date: newExpense.date,
              paidBy: newExpense.paidBy,
              splitBetween,
            });
            setIsAddExpenseOpen(false);
            setNewExpense((prev) => ({ ...prev, amount: 0, category: "", note: "" }));
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount</label>
              <input
                required
                type="number"
                min={0}
                value={newExpense.amount}
                onChange={(e) => setNewExpense((p) => ({ ...p, amount: Number(e.target.value) }))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date</label>
              <input
                required
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense((p) => ({ ...p, date: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
            <input
              required
              value={newExpense.category}
              onChange={(e) => setNewExpense((p) => ({ ...p, category: e.target.value }))}
              placeholder="Food, Taxi, Rent..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Note</label>
            <input
              value={newExpense.note}
              onChange={(e) => setNewExpense((p) => ({ ...p, note: e.target.value }))}
              placeholder="Optional"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Paid by</label>
            <select
              value={newExpense.paidBy}
              onChange={(e) => setNewExpense((p) => ({ ...p, paidBy: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500"
            >
              {memberOptions.map((m) => (
                <option key={m.uid} value={m.uid}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Split between</label>
            <div className="grid grid-cols-2 gap-2">
              {memberOptions.map((m) => {
                const checked = newExpense.splitBetween.includes(m.uid);
                return (
                  <label
                    key={m.uid}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-2xl border cursor-pointer transition-all",
                      checked
                        ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/20"
                        : "border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setNewExpense((p) => {
                          const next = new Set(p.splitBetween);
                          if (e.target.checked) next.add(m.uid);
                          else next.delete(m.uid);
                          return { ...p, splitBetween: Array.from(next) };
                        });
                      }}
                    />
                    <span className="text-sm font-bold">{m.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl shadow-xl hover:opacity-90 transition-all"
          >
            Save
          </button>
        </form>
      </Modal>

      <Modal isOpen={isVaultSettingsOpen} onClose={() => setIsVaultSettingsOpen(false)} title="Vault settings">
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-200">
          <div className="font-bold">Settings icon is wired now.</div>
          <div className="text-xs text-slate-500">
            Next: edit vault name/budget, leave vault, and manage roles (owner/member).
          </div>
        </div>
      </Modal>

      {/* UPI QR Modal */}
      <Modal isOpen={!!qrData} onClose={() => setQrData(null)} title="Payment QR Code">
        {qrData && (
          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            <div className="p-6 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50">
              <QRCodeSVG
                value={qrData.upiLink}
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paying To</div>
              <div className="text-xl font-black text-slate-900 dark:text-white">{qrData.toName}</div>
              <div className="text-3xl font-black text-blue-600">₹{qrData.amount.toLocaleString()}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Vault: {vault?.name}
              </div>
            </div>

            <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Scan with GPay, PhonePe, Paytm or any UPI app
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrData.upiLink);
                  toast.success("UPI link copied!");
                }}
                className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Copy size={16} /> Copy UPI Link
              </button>
            </div>
          </div>
        )}
      </Modal>
    </motion.main>
  );
}
