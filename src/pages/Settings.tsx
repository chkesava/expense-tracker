import { useState, useEffect } from "react";
import useSettings from "../hooks/useSettings";
import { CATEGORIES } from "../types/expense";
import { useAuth } from "../hooks/useAuth";
import { useExpenses } from "../hooks/useExpenses";
import { useCategories } from "../hooks/useCategories";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useAccounts } from "../hooks/useAccounts";
import { exportExpensesToCSV } from "../utils/exportCsv";
import { deleteDoc, collection, getDocs, doc, writeBatch, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";
import Avatar from "../components/Avatar";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { motion, type Variants } from "framer-motion";
import { cn } from "../lib/utils";

const TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export default function SettingsPage() {
  const { settings, setLockPastMonths, setDefaultCategory, setDefaultView, setExportYear, setMonthlyBudget, setTimezone, toggleDashboardWidget } = useSettings();
  const { user } = useAuth();
  const expenses = useExpenses();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [username, setUsername] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const { categories, addCategory, deleteCategory } = useCategories();
  const { accountTypes, addAccountType, deleteAccountType } = useAccountTypes();
  const { accounts, addAccount, deleteAccount } = useAccounts();

  const [newCategory, setNewCategory] = useState("");
  const [newAccountType, setNewAccountType] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [selectedAccountType, setSelectedAccountType] = useState("");

  const getAccountTypePalette = (name: string) => {
    const normalized = name.trim().toLowerCase();

    if (normalized.includes("bank")) {
      return {
        ribbon: "bg-emerald-600 text-white",
        chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
      };
    }

    if (normalized.includes("cash")) {
      return {
        ribbon: "bg-amber-500 text-amber-950",
        chip: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
      };
    }

    if (normalized.includes("card") || normalized.includes("credit") || normalized.includes("debit")) {
      return {
        ribbon: "bg-violet-600 text-white",
        chip: "bg-violet-50 text-violet-700 border-violet-200",
        dot: "bg-violet-500",
      };
    }

    if (normalized.includes("wallet") || normalized.includes("upi")) {
      return {
        ribbon: "bg-sky-600 text-white",
        chip: "bg-sky-50 text-sky-700 border-sky-200",
        dot: "bg-sky-500",
      };
    }

    return {
      ribbon: "bg-slate-700 text-white",
      chip: "bg-slate-100 text-slate-700 border-slate-200",
      dot: "bg-slate-500",
    };
  };

  // Fetch existing username on mount
  useEffect(() => {
    async function fetchProfile() {
      if (user?.uid) {
        try {
          const docRef = doc(db, "users", user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setUsername(snap.data().username || "");
          }
        } catch (err) {
          console.error("Failed to fetch profile", err);
        }
      }
    }
    fetchProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const docRef = doc(db, "users", user.uid);
      // Sync Auth data (email, displayName) to Firestore along with new username
      // This ensures Admin Dashboard has data to display
      await updateDoc(docRef, {
        username,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error(err);
      // If doc doesn't exist (updateDoc fails), try setDoc with merge
      try {
        const { setDoc } = await import("firebase/firestore");
        const docRef = doc(db, "users", user.uid);
        await setDoc(docRef, {
          username,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: "USER" // Default role if creating new
        }, { merge: true });
        toast.success("Profile updated successfully");
      } catch (retryErr) {
        console.error("Retry failed", retryErr);
        toast.error("Failed to update profile");
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleExportYear = () => {
    if (!user) return toast.error("Sign in to export data");

    const year = settings.exportYear;
    const filtered = expenses.filter((e) => (e.month ?? "").startsWith(String(year)));
    if (!filtered.length) return toast.info("No expenses for selected year");
    exportExpensesToCSV(filtered, `expenses-${year}.csv`);
  };

  const handleDeleteAll = async () => {
    if (!user) return;
    setIsDeleting(true);

    try {
      const colRef = collection(db, "users", user.uid, "expenses");
      const snap = await getDocs(colRef);

      if (snap.empty) {
        toast.info("No data to delete");
        setIsDeleting(false);
        setShowDeleteConfirm(false);
        return;
      }

      // Batch delete (limit 500 per batch)
      const batch = writeBatch(db);
      snap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      toast.success(`Deleted ${snap.size} expenses`);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete data");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-3xl mx-auto px-4 pt-20 md:pt-24 pb-28 md:pb-20 space-y-4 md:space-y-6"
      >
        {/* Profile Section */}
        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white/60 p-4 md:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col sm:flex-row items-center gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
          <Avatar
            src={user?.photoURL}
            name={user?.displayName || "User"}
            size={64}
            className="shadow-md ring-4 ring-white"
          />
          <div className="text-center sm:text-left flex-1">
            <div className="text-lg md:text-xl font-bold text-slate-900">{user?.displayName || "Guest User"}</div>
            <div className="text-sm text-slate-500 font-medium break-all">{user?.email}</div>
          </div>
          
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="min-h-11 flex-1 sm:w-32 md:w-48 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block px-3 py-2.5 outline-none"
            />
            <button
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="min-h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {isSavingProfile ? "..." : "Save"}
            </button>
          </div>
        </motion.div>

        {/* Preferences Section */}
        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white/60 p-4 md:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">🎨</span>
            Preferences
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Default category</label>
              <div className="relative">
                <select
                  value={settings.defaultCategory}
                  onChange={(e) => setDefaultCategory(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 pr-10 hover:bg-slate-100 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-offset-1"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Timezone</label>
              <div className="relative">
                <select
                  value={settings.timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 pr-10 hover:bg-slate-100 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-offset-1"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                  {!TIMEZONES.includes(settings.timezone) && (
                    <option value={settings.timezone}>{settings.timezone}</option>
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Default view</label>
              <div className="relative">
                <select
                  value={settings.defaultView}
                  onChange={(e) => setDefaultView(e.target.value as "add" | "expenses" | "analytics" | "dashboard")}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 pr-10 hover:bg-slate-100 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-offset-1"
                >
                  <option value="add">Add expense</option>
                  <option value="expenses">Expenses</option>
                  <option value="analytics">Analytics</option>
                  <option value="dashboard">Dashboard</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Monthly budget</label>
              <input
                type="number"
                value={String(settings.monthlyBudget)}
                min={0}
                onChange={(e) => setMonthlyBudget(Number(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 hover:bg-slate-100 transition-colors outline-none focus:ring-2 focus:ring-offset-1 placeholder:text-slate-400"
                placeholder="0 to disable"
              />
            </div>
          </div>
        </motion.div>

        {/* Dashboard Customization Section */}
        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white/60 p-4 md:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">📊</span>
            Dashboard Widgets
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: 'subscriptions', label: 'Subscriptions', desc: 'Track recurring payments' },
              { id: 'focus', label: 'Focus Mode', desc: 'Goals & daily limits' },
              { id: 'gamification', label: 'Gamification', desc: 'Level, XP & stats' },
              { id: 'topCategories', label: 'Top Categories', desc: 'Ranking by spend' },
            ].map((widget) => (
              <div key={widget.id} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-100/80 min-h-20">
                <div>
                  <div className="text-[14px] font-semibold text-slate-800">{widget.label}</div>
                  <div className="mt-1 text-[11px] leading-4 text-slate-500 font-medium">{widget.desc}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.dashboardWidgets?.[widget.id as keyof typeof settings.dashboardWidgets] ?? true}
                    onChange={() => toggleDashboardWidget(widget.id as any)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Protection Section */}
        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white/60 p-4 md:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">🛡️</span>
            Protection
          </h3>
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50/70 border border-slate-100/80 px-4 py-3">
            <div>
              <div className="text-[15px] font-semibold text-slate-800">Lock past months</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Prevent changes to history</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.lockPastMonths}
                onChange={(e) => setLockPastMonths(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </motion.div>

        {/* Data Section */}
        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white/60 p-4 md:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">💾</span>
            Data Management
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <select
                value={String(settings.exportYear)}
                onChange={(e) => setExportYear(Number(e.target.value))}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 pr-10 hover:bg-slate-100 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-offset-1"
              >
                {Array.from({ length: 5 }).map((_, i) => {
                  const y = new Date().getFullYear() - i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
              </div>
            </div>
            <button
              onClick={handleExportYear}
              className="w-full sm:flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all duration-200"
            >
              Export CSV
            </button>
          </div>
        </motion.div>

        {/* Account Types Section */}
        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white/60 p-4 md:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">🏷️</span>
            Account Types
          </h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newAccountType}
              onChange={(e) => setNewAccountType(e.target.value)}
              placeholder="e.g. Bank, Cash, Card"
              className="min-h-11 flex-1 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              onClick={() => { addAccountType(newAccountType); setNewAccountType(""); }}
              className="min-h-11 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
            >
              Add
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
            {accountTypes.map((type) => (
              <div key={type.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50/70 border border-slate-100 group">
                <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.24em]", getAccountTypePalette(type.name).chip)}>
                  <span className={cn("h-2 w-2 rounded-full", getAccountTypePalette(type.name).dot)} />
                  {type.name}
                </span>
                <button
                  onClick={() => deleteAccountType(type.id)}
                  className="text-slate-400 hover:text-red-500 p-1 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            ))}
            {accountTypes.length === 0 && <p className="text-xs text-slate-400 text-center py-4 italic sm:col-span-2">No account types added yet.</p>}
          </div>
        </motion.div>

        {/* Accounts Section */}
        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white/60 p-4 md:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">🏦</span>
            Accounts
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="Account Name"
                className="min-h-11 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <select
                value={selectedAccountType}
                onChange={(e) => setSelectedAccountType(e.target.value)}
                className="min-h-11 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-3 outline-none cursor-pointer appearance-none"
              >
                <option value="">Select Type</option>
                {accountTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <button
              onClick={() => { addAccount(newAccountName, selectedAccountType); setNewAccountName(""); setSelectedAccountType(""); }}
              disabled={!newAccountName || !selectedAccountType}
              className="w-full min-h-11 bg-blue-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/10 active:scale-[0.98]"
            >
              Add Account
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
            {accounts.map((acc) => {
              const typeName = accountTypes.find(t => t.id === acc.typeId)?.name || "Unknown Type";
              const palette = getAccountTypePalette(typeName);

              return (
                <div key={acc.id} className="group relative overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 p-4 pt-12 shadow-[0_8px_30px_rgb(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgb(15,23,42,0.08)]">
                  <div className={cn("absolute right-3 top-3 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.24em] shadow-sm", palette.ribbon)}>
                    {typeName}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">{acc.name}</div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <span className={cn("h-2.5 w-2.5 rounded-full", palette.dot)} />
                        Ready for expense tagging
                      </div>
                    </div>

                    <button
                      onClick={() => deleteAccount(acc.id)}
                      className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-400 transition-colors hover:border-red-200 hover:text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label={`Delete ${acc.name}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
            {accounts.length === 0 && <p className="text-xs text-slate-400 text-center py-4 italic sm:col-span-2">No accounts added yet.</p>}
          </div>
        </motion.div>

        {/* Custom Categories Section */}
        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white/60 p-4 md:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-orange-50 text-orange-600">📁</span>
            Custom Categories
          </h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name"
              className="min-h-11 flex-1 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              onClick={() => { addCategory(newCategory); setNewCategory(""); }}
              className="min-h-11 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
            >
              Add
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 border border-slate-100 group">
                <span className="text-xs font-bold text-slate-700">{cat.name}</span>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="text-slate-400 hover:text-red-500 p-1 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            ))}
            {categories.length === 0 && <p className="text-xs text-slate-400 text-center col-span-2 py-4 italic">No custom categories. (Defaults available)</p>}
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div variants={itemVariants} className="bg-red-50/50 backdrop-blur-sm border border-red-100 p-4 md:p-6 rounded-3xl space-y-4">
          <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-red-100/50 text-red-600">⚠️</span>
            Danger Zone
          </h3>
          <p className="text-xs text-red-500 font-medium ml-1">Irreversible actions that cannot be undone.</p>
          <button
            className="w-full bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 font-semibold py-3 px-6 rounded-xl transition-colors duration-200"
            onClick={() => {
              if (!user) return toast.error("Sign in to delete data");
              setShowDeleteConfirm(true);
            }}
          >
            Delete all data
          </button>
        </motion.div>
      </motion.main>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete All Data"
        message="This will permanently delete ALL your recorded expenses. This action cannot be undone. Are you absolutely sure?"
        confirmText={isDeleting ? "Deleting..." : "Yes, Delete Everything"}
        onConfirm={handleDeleteAll}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
