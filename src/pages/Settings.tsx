import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { Brush, Database, Folder, LayoutGrid, SlidersHorizontal, Trash2, User, WalletCards } from "lucide-react";
import { toast } from "react-toastify";

import useSettings from "../hooks/useSettings";
import { useAuth } from "../hooks/useAuth";
import { useExpenses } from "../hooks/useExpenses";
import { useTheme } from "../hooks/useTheme";
import { useCategories } from "../hooks/useCategories";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useAccounts } from "../hooks/useAccounts";
import { useCategoryBudgets } from "../hooks/useCategoryBudgets";
import { useFinancialGoals } from "../hooks/useFinancialGoals";
import { useCategorizationRules } from "../hooks/useCategorizationRules";
import { CATEGORIES } from "../types/expense";
import { exportExpensesToCSV } from "../utils/exportCsv";
import { db } from "../firebase";
import Avatar from "../components/Avatar";
import ConfirmDialog from "../components/common/ConfirmDialog";
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

type SectionId = "profile" | "general" | "personalize" | "manage" | "accounts" | "data";

type BottomTabId = "home" | "expenses" | "split" | "subscriptions" | "analytics" | "settings";
type WidgetId = "subscriptions" | "focus" | "gamification" | "topCategories";

const BOTTOM_TAB_DEFS: ReadonlyArray<{ id: BottomTabId; label: string; desc: string }> = [
  { id: "home", label: "Home", desc: "Dashboard & quick add" },
  { id: "expenses", label: "Expenses", desc: "Full expense list" },
  { id: "split", label: "Split", desc: "Shared costs" },
  { id: "subscriptions", label: "Subscriptions", desc: "Recurring payments" },
  { id: "analytics", label: "Analytics", desc: "Charts & insights" },
  { id: "settings", label: "Settings", desc: "Configuration" },
];

const WIDGET_DEFS: ReadonlyArray<{ id: WidgetId; label: string; desc: string }> = [
  { id: "subscriptions", label: "Subscriptions", desc: "Recurring payments" },
  { id: "focus", label: "Focus Mode", desc: "Goals & limits" },
  { id: "gamification", label: "Gamification", desc: "Streaks & XP" },
  { id: "topCategories", label: "Top Categories", desc: "Rank by spend" },
];

const surfaceClass =
  "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors";

const fieldClass =
  "min-h-11 w-full rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500";

function SettingsCard({ title, subtitle, icon: Icon, children }: { title: string; subtitle?: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className={cn(surfaceClass, "p-5 md:p-6")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
          </div>
          {subtitle && <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function SettingsRow({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{title}</div>
        {description && <div className="mt-1 text-[11px] font-medium leading-4 text-slate-500 dark:text-slate-400">{description}</div>}
      </div>
      <div className="sm:shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 dark:bg-slate-700 dark:peer-focus:ring-blue-900/20 peer-checked:bg-blue-600" />
    </label>
  );
}

export default function SettingsPage() {
  const {
    settings,
    setLockPastMonths,
    setDefaultCategory,
    setDefaultView,
    setExportYear,
    setMonthlyBudget,
    setTimezone,
    setUpiId,
    toggleBottomNavTab,
    toggleDashboardWidget,
    setNavigationStyle,
  } = useSettings();
  const { user } = useAuth();
  const { expenses } = useExpenses();
  const { theme, setTheme } = useTheme();

  const { categories, addCategory, deleteCategory } = useCategories();
  const { accountTypes, addAccountType, deleteAccountType } = useAccountTypes();
  const { accounts, addAccount, deleteAccount } = useAccounts();
  const { budgets, addBudget, deleteBudget } = useCategoryBudgets();
  const { goals, addGoal, updateGoalProgress, deleteGoal } = useFinancialGoals();
  const { rules, addRule, deleteRule } = useCategorizationRules();

  const [active, setActive] = useState<SectionId>("general");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [username, setUsername] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [newCategory, setNewCategory] = useState("");
  const [newAccountType, setNewAccountType] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [selectedAccountType, setSelectedAccountType] = useState("");

  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetMonth, setBudgetMonth] = useState(new Date().toISOString().slice(0, 7));

  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");

  const [ruleKeyword, setRuleKeyword] = useState("");
  const [ruleCategory, setRuleCategory] = useState("");

  const allCategoryOptions = useMemo(() => [...CATEGORIES, ...categories.map((c) => c.name)], [categories]);

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.uid) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) setUsername((snap.data().username as string) || "");
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    }
    fetchProfile();
  }, [user?.uid]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, { username, email: user.email, displayName: user.displayName, photoURL: user.photoURL });
      toast.success("Profile updated");
    } catch (err) {
      console.error(err);
      try {
        const docRef = doc(db, "users", user.uid);
        await setDoc(docRef, { username, email: user.email, displayName: user.displayName, photoURL: user.photoURL, role: "USER" }, { merge: true });
        toast.success("Profile updated");
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
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
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

  const sections = useMemo(
    () => [
      { id: "profile" as const, label: "Profile", icon: User },
      { id: "general" as const, label: "General", icon: SlidersHorizontal },
      { id: "personalize" as const, label: "Personalize", icon: Brush },
      { id: "manage" as const, label: "Manage", icon: LayoutGrid },
      { id: "accounts" as const, label: "Accounts", icon: WalletCards },
      { id: "data" as const, label: "Data", icon: Database },
    ],
    []
  );

  const pill = (isActive: boolean) =>
    cn(
      "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black transition-colors",
      isActive
        ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
        : "bg-white/70 text-slate-600 hover:bg-white dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
    );

  return (
    <>
      <main className="settings-page mx-auto min-h-[100dvh] max-w-5xl px-4 pt-20 md:pt-24 pb-32">
        <div className="mb-5">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Settings</h1>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Grouped by section so it’s handy and not a long messy page.</p>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-2 md:hidden">
          {sections.map((s) => (
            <button key={s.id} onClick={() => setActive(s.id)} className={pill(active === s.id)}>
              <s.icon className="h-4 w-4" />
              {s.label}
            </button>
          ))}
        </div>

        <div className="md:flex md:items-start md:gap-6">
          <aside className="hidden md:block md:w-72 md:shrink-0">
            <div className={cn(surfaceClass, "sticky top-24 p-3")}>
              <div className="space-y-1">
                {sections.map((s) => {
                  const isActive = active === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActive(s.id)}
                      className={cn("w-full rounded-2xl px-3 py-2 text-left transition-colors", isActive ? "bg-blue-600 text-white shadow-sm" : "hover:bg-slate-100 dark:hover:bg-slate-800/60")}
                    >
                      <div className="flex items-center gap-2">
                        <s.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-500 dark:text-slate-400")} />
                        <div className={cn("text-sm font-black", isActive ? "text-white" : "text-slate-900 dark:text-slate-100")}>{s.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1 space-y-4">
            {active === "profile" && (
              <SettingsCard title="Profile" subtitle="Update your profile settings." icon={User}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar src={user?.photoURL} name={user?.displayName || "User"} size={64} className="shadow-md ring-4 ring-white dark:ring-slate-950" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">{user?.displayName || "Guest User"}</div>
                    <div className="mt-0.5 break-all text-sm font-medium text-slate-500 dark:text-slate-400">{user?.email}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-1.5">
                    <label className="ml-1 text-xs font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Username</label>
                    <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your username" className={fieldClass} />
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="min-h-11 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                  >
                    {isSavingProfile ? "Saving..." : "Save"}
                  </button>
                </div>
              </SettingsCard>
            )}

            {active === "general" && (
              <SettingsCard title="General" subtitle="Defaults and protection." icon={SlidersHorizontal}>
                <SettingsRow title="Default category" description="Used for quick add defaults.">
                  <select value={settings.defaultCategory} onChange={(e) => setDefaultCategory(e.target.value)} className={cn(fieldClass, "cursor-pointer appearance-none")}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </SettingsRow>

                <SettingsRow title="Timezone" description="Used for grouping and date calculations.">
                  <select value={settings.timezone} onChange={(e) => setTimezone(e.target.value)} className={cn(fieldClass, "cursor-pointer appearance-none")}>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                    {!TIMEZONES.includes(settings.timezone) && <option value={settings.timezone}>{settings.timezone}</option>}
                  </select>
                </SettingsRow>

                <SettingsRow title="Default view" description="Where the app opens.">
                  <select value={settings.defaultView} onChange={(e) => setDefaultView(e.target.value as any)} className={cn(fieldClass, "cursor-pointer appearance-none")}>
                    <option value="dashboard">Dashboard</option>
                    <option value="expenses">Expenses</option>
                    <option value="analytics">Analytics</option>
                    <option value="add">Add expense</option>
                  </select>
                </SettingsRow>

                <SettingsRow title="Monthly budget" description="Set 0 to disable.">
                  <input type="number" min={0} value={String(settings.monthlyBudget)} onChange={(e) => setMonthlyBudget(Number(e.target.value) || 0)} className={fieldClass} />
                </SettingsRow>

                <SettingsRow title="UPI ID" description="Used for split payments.">
                  <input value={settings.upiId || ""} onChange={(e) => setUpiId(e.target.value)} className={fieldClass} placeholder="name@bank" />
                </SettingsRow>

                <SettingsRow title="Lock past months" description="Prevent editing previous months.">
                  <Toggle checked={!!settings.lockPastMonths} onChange={(next) => setLockPastMonths(next)} />
                </SettingsRow>
              </SettingsCard>
            )}

            {active === "personalize" && (
              <SettingsCard title="Personalize" subtitle="Theme and navigation." icon={Brush}>
                <SettingsRow title="Theme" description="Choose your app atmosphere.">
                  <select value={theme} onChange={(e) => setTheme(e.target.value as any)} className={cn(fieldClass, "cursor-pointer appearance-none")}>
                    <option value="light">Classic Light</option>
                    <option value="dark">Midnight</option>
                    <option value="midnight-olive">Midnight Olive</option>
                    <option value="vintage-parchment">Vintage Parchment</option>
                    <option value="sakura-bloom">Sakura Bloom</option>
                  </select>
                </SettingsRow>

                <SettingsRow title="Navigation style" description="How you move through the app.">
                  <select value={settings.navigationStyle} onChange={(e) => setNavigationStyle(e.target.value as any)} className={cn(fieldClass, "cursor-pointer appearance-none")}>
                    <option value="bottom">Modern Tab Bar</option>
                    <option value="dock">Floating Menu</option>
                  </select>
                </SettingsRow>

                <details className="rounded-2xl border border-slate-100/80 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <summary className="cursor-pointer list-none">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">Mobile tabs</div>
                    <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Toggle which tabs appear in bottom navigation.</div>
                  </summary>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {BOTTOM_TAB_DEFS.map((tab) => (
                      <SettingsRow key={tab.id} title={tab.label} description={tab.desc}>
                        <Toggle checked={settings.bottomNavTabs?.[tab.id] ?? true} onChange={() => toggleBottomNavTab(tab.id as any)} />
                      </SettingsRow>
                    ))}
                  </div>
                </details>

                <details className="rounded-2xl border border-slate-100/80 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <summary className="cursor-pointer list-none">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">Dashboard widgets</div>
                    <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Hide widgets you don’t use.</div>
                  </summary>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {WIDGET_DEFS.map((widget) => (
                      <SettingsRow key={widget.id} title={widget.label} description={widget.desc}>
                        <Toggle checked={settings.dashboardWidgets?.[widget.id] ?? true} onChange={() => toggleDashboardWidget(widget.id as any)} />
                      </SettingsRow>
                    ))}
                  </div>
                </details>

                <details className="rounded-2xl border border-slate-100/80 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <summary className="cursor-pointer list-none">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">Auto-categorization ({rules.length})</div>
                    <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Assign a category when a keyword appears in note.</div>
                  </summary>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1.1fr_1fr_auto]">
                    <input value={ruleKeyword} onChange={(e) => setRuleKeyword(e.target.value)} placeholder='Keyword, e.g. "netflix"' className={fieldClass} />
                    <select value={ruleCategory} onChange={(e) => setRuleCategory(e.target.value)} className={cn(fieldClass, "cursor-pointer appearance-none")}>
                      <option value="">Category</option>
                      {allCategoryOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        addRule(ruleKeyword, ruleCategory);
                        setRuleKeyword("");
                        setRuleCategory("");
                      }}
                      disabled={!ruleKeyword || !ruleCategory}
                      className="min-h-11 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {rules.length === 0 && <div className="py-3 text-center text-xs italic text-slate-400">No rules yet.</div>}
                    {rules.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-slate-900 dark:text-slate-100">{r.keyword}</div>
                          <div className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">Assigns to {r.category}</div>
                        </div>
                        <button onClick={() => deleteRule(r.id)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              </SettingsCard>
            )}

            {active === "manage" && (
              <SettingsCard title="Manage" subtitle="Budgets and goals — kept tidy." icon={LayoutGrid}>
                <details className="rounded-2xl border border-slate-100/80 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <summary className="cursor-pointer list-none">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">Category budgets ({budgets.length})</div>
                    <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Set per-category monthly limits.</div>
                  </summary>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <select value={budgetCategory} onChange={(e) => setBudgetCategory(e.target.value)} className={cn(fieldClass, "cursor-pointer appearance-none")}>
                      <option value="">Category</option>
                      {allCategoryOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <input type="month" value={budgetMonth} onChange={(e) => setBudgetMonth(e.target.value)} className={fieldClass} />
                    <input type="number" min={0} value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} placeholder="Amount" className={fieldClass} />
                  </div>
                  <button
                    onClick={() => {
                      addBudget(budgetCategory, Number(budgetAmount), budgetMonth);
                      setBudgetAmount("");
                      setBudgetCategory("");
                    }}
                    disabled={!budgetCategory || !budgetAmount || !budgetMonth}
                    className="mt-3 min-h-11 w-full rounded-xl bg-blue-600 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                  >
                    Add budget
                  </button>
                  <div className="mt-4 space-y-2">
                    {budgets.length === 0 && <div className="py-3 text-center text-xs italic text-slate-400">No category budgets yet.</div>}
                    {budgets.map((b) => (
                      <div key={b.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-slate-900 dark:text-slate-100">{b.category}</div>
                          <div className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {b.month} • ₹{b.amount.toLocaleString()}
                          </div>
                        </div>
                        <button onClick={() => deleteBudget(b.id)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </details>

                <details className="rounded-2xl border border-slate-100/80 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <summary className="cursor-pointer list-none">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">Financial goals ({goals.length})</div>
                    <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Track targets with progress.</div>
                  </summary>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="Goal name" className={fieldClass} />
                    <input type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} className={fieldClass} />
                    <input type="number" min={0} value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} placeholder="Target amount" className={fieldClass} />
                    <input type="number" min={0} value={goalCurrent} onChange={(e) => setGoalCurrent(e.target.value)} placeholder="Current progress" className={fieldClass} />
                  </div>
                  <button
                    onClick={() => {
                      addGoal(goalName, Number(goalTarget), Number(goalCurrent), goalDeadline);
                      setGoalName("");
                      setGoalTarget("");
                      setGoalCurrent("");
                      setGoalDeadline("");
                    }}
                    disabled={!goalName || !goalTarget}
                    className="mt-3 min-h-11 w-full rounded-xl bg-blue-600 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                  >
                    Add goal
                  </button>
                  <div className="mt-4 space-y-3">
                    {goals.length === 0 && <div className="py-3 text-center text-xs italic text-slate-400">No financial goals yet.</div>}
                    {goals.map((g) => {
                      const progress = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
                      return (
                        <div key={g.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black text-slate-900 dark:text-slate-100">{g.name}</div>
                              <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                Target ₹{g.targetAmount.toLocaleString()}
                                {g.deadline ? ` • by ${g.deadline}` : ""}
                              </div>
                            </div>
                            <button onClick={() => deleteGoal(g.id)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
                              Delete
                            </button>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${progress}%` }} />
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <input type="number" min={0} defaultValue={g.currentAmount} onBlur={(e) => updateGoalProgress(g.id, Number(e.target.value))} className={cn(fieldClass, "min-h-10 py-2")} />
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{progress}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              </SettingsCard>
            )}

            {active === "accounts" && (
              <SettingsCard title="Accounts" subtitle="Accounts, types, and custom categories." icon={WalletCards}>
                <details className="rounded-2xl border border-slate-100/80 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <summary className="cursor-pointer list-none">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">Account types ({accountTypes.length})</div>
                    <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Examples: Bank, Cash, Card.</div>
                  </summary>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input value={newAccountType} onChange={(e) => setNewAccountType(e.target.value)} placeholder="e.g. Bank" className={fieldClass} />
                    <button
                      onClick={() => {
                        addAccountType(newAccountType);
                        setNewAccountType("");
                      }}
                      className="min-h-11 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 active:scale-95"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {accountTypes.length === 0 && <div className="py-3 text-center text-xs italic text-slate-400 sm:col-span-2">No account types yet.</div>}
                    {accountTypes.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                        <div className="truncate text-sm font-black text-slate-900 dark:text-slate-100">{t.name}</div>
                        <button onClick={() => deleteAccountType(t.id)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:text-red-500 dark:border-slate-700 dark:bg-slate-900">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </details>

                <details className="rounded-2xl border border-slate-100/80 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <summary className="cursor-pointer list-none">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">Accounts ({accounts.length})</div>
                    <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Tag expenses with an account.</div>
                  </summary>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="Account name" className={fieldClass} />
                    <select value={selectedAccountType} onChange={(e) => setSelectedAccountType(e.target.value)} className={cn(fieldClass, "cursor-pointer appearance-none")}>
                      <option value="">Select type</option>
                      {accountTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      addAccount(newAccountName, selectedAccountType);
                      setNewAccountName("");
                      setSelectedAccountType("");
                    }}
                    disabled={!newAccountName || !selectedAccountType}
                    className="mt-3 min-h-11 w-full rounded-xl bg-blue-600 py-3 text-sm font-black text-white hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                  >
                    Add account
                  </button>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {accounts.map((a) => {
                      const typeName = accountTypes.find((t) => t.id === a.typeId)?.name || "Unknown";
                      return (
                        <div key={a.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-slate-900 dark:text-slate-100">{a.name}</div>
                            <div className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{typeName}</div>
                          </div>
                          <button onClick={() => deleteAccount(a.id)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:text-red-500 dark:border-slate-700 dark:bg-slate-900">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </details>

                <details className="rounded-2xl border border-slate-100/80 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <summary className="cursor-pointer list-none">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">Custom categories ({categories.length})</div>
                    <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Add categories beyond defaults.</div>
                  </summary>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category" className={fieldClass} />
                    <button
                      onClick={() => {
                        addCategory(newCategory);
                        setNewCategory("");
                      }}
                      className="min-h-11 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 active:scale-95"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {categories.length === 0 && <div className="py-3 text-center text-xs italic text-slate-400 sm:col-span-2">No custom categories yet.</div>}
                    {categories.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                        <div className="truncate text-sm font-black text-slate-900 dark:text-slate-100">{c.name}</div>
                        <button onClick={() => deleteCategory(c.id)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:text-red-500 dark:border-slate-700 dark:bg-slate-900">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              </SettingsCard>
            )}

            {active === "data" && (
              <SettingsCard title="Data" subtitle="Export, import and safety." icon={Database}>
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 ml-1">Export</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                    <select value={String(settings.exportYear)} onChange={(e) => setExportYear(Number(e.target.value))} className={cn(fieldClass, "cursor-pointer appearance-none")}>
                      {Array.from({ length: 5 }).map((_, i) => {
                        const y = new Date().getFullYear() - i;
                        return (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      onClick={handleExportYear}
                      className="min-h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 ml-1">Import</div>
                  <Link
                    to="/import"
                    className="flex items-center justify-between rounded-2xl border border-dashed border-blue-200 bg-blue-50/70 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-100/70 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Folder className="h-4 w-4" /> Import expenses from CSV
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.24em]">Open</span>
                  </Link>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 ml-1">Danger zone</div>
                  <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-red-700 dark:text-red-300">Delete all data</div>
                        <div className="mt-1 text-[11px] font-medium text-red-600/80 dark:text-red-300/80">Permanently deletes all recorded expenses.</div>
                      </div>
                      <button
                        onClick={() => {
                          if (!user) return toast.error("Sign in to delete data");
                          setShowDeleteConfirm(true);
                        }}
                        className="min-h-10 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:bg-slate-950 dark:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </SettingsCard>
            )}
          </div>
        </div>
      </main>

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
