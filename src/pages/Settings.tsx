import { useState, useEffect } from "react";
import useSettings from "../hooks/useSettings";
import { CATEGORIES } from "../types/expense";
import { useAuth } from "../hooks/useAuth";
import { useExpenses } from "../hooks/useExpenses";
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
        className="max-w-2xl mx-auto px-4 pt-24 pb-20 space-y-6"
      >
        {/* Profile Section */}
        <motion.div variants={itemVariants} className="bg-card border border-border p-6 rounded-xl shadow-card flex flex-col md:flex-row items-start md:items-center gap-4 hover:shadow-card-hover transition-all duration-300">
          <Avatar
            src={user?.photoURL}
            name={user?.displayName || "User"}
            size={64}
            className="shadow-md ring-4 ring-white"
          />
          <div>
            <div className="text-xl font-bold text-foreground">{user?.displayName || "Guest User"}</div>
            <div className="text-sm text-muted-foreground font-medium">{user?.email}</div>
          </div>

          <div className="w-full md:w-auto md:ml-auto flex items-center gap-2 mt-4 md:mt-0" id="settings-username-section">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Set username"
              className="bg-muted border border-border text-foreground text-sm rounded-lg focus:ring-2 focus:ring-ring/20 focus:border-primary block p-2 flex-1 md:w-48 outline-none"
            />
            <button
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="bg-primary text-primary-foreground hover:opacity-90 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {isSavingProfile ? "..." : "Save"}
            </button>
          </div>
        </motion.div>

        {/* Preferences Section */}
        <motion.div variants={itemVariants} className="bg-card border border-border p-6 rounded-xl shadow-card space-y-6">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">🎨</span>
            Preferences
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground ml-1">Default category</label>
              <div className="relative">
                <select
                  value={settings.defaultCategory}
                  onChange={(e) => setDefaultCategory(e.target.value)}
                  className="w-full appearance-none bg-muted border border-border text-foreground text-sm rounded-xl focus:ring-2 focus:ring-ring/20 focus:border-primary block p-3 pr-10 hover:bg-slate-100 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-offset-1"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground ml-1">Timezone</label>
              <div className="relative">
                <select
                  value={settings.timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full appearance-none bg-muted border border-border text-foreground text-sm rounded-xl focus:ring-2 focus:ring-ring/20 focus:border-primary block p-3 pr-10 hover:bg-slate-100 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-offset-1"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                  {!TIMEZONES.includes(settings.timezone) && (
                    <option value={settings.timezone}>{settings.timezone}</option>
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground ml-1">Default view</label>
              <div className="relative">
                <select
                  value={settings.defaultView}
                  onChange={(e) => setDefaultView(e.target.value as "add" | "expenses" | "analytics" | "dashboard")}
                  className="w-full appearance-none bg-muted border border-border text-foreground text-sm rounded-xl focus:ring-2 focus:ring-ring/20 focus:border-primary block p-3 pr-10 hover:bg-slate-100 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-offset-1"
                >
                  <option value="add">Add expense</option>
                  <option value="expenses">Expenses</option>
                  <option value="analytics">Analytics</option>
                  <option value="dashboard">Dashboard</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground ml-1">Monthly budget</label>
              <input
                type="number"
                value={String(settings.monthlyBudget)}
                min={0}
                onChange={(e) => setMonthlyBudget(Number(e.target.value) || 0)}
                className="w-full bg-muted border border-border text-foreground text-sm rounded-xl focus:ring-2 focus:ring-ring/20 focus:border-primary block p-3 hover:bg-slate-100 transition-colors outline-none focus:ring-2 focus:ring-offset-1 placeholder:text-slate-400"
                placeholder="0 to disable"
              />
            </div>
          </div>
        </motion.div>

        {/* Dashboard Customization Section */}
        <motion.div
          variants={itemVariants}
          className="bg-card border border-border p-6 rounded-xl shadow-card space-y-4"
          id="settings-widgets-section"
        >
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">📊</span>
            Dashboard Widgets
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: 'subscriptions', label: 'Subscriptions', desc: 'Track recurring payments' },
              { id: 'focus', label: 'Focus Mode', desc: 'Goals & daily limits' },
              { id: 'gamification', label: 'Gamification', desc: 'Level, XP & stats' },
              { id: 'topCategories', label: 'Top Categories', desc: 'Ranking by spend' },
            ].map((widget) => (
              <div key={widget.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-slate-100/50">
                <div>
                  <div className="text-[14px] font-semibold text-foreground">{widget.label}</div>
                  <div className="text-[10px] text-muted-foreground font-medium">{widget.desc}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.dashboardWidgets?.[widget.id as keyof typeof settings.dashboardWidgets] ?? true}
                    onChange={() => toggleDashboardWidget(widget.id as any)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Protection Section */}
        <motion.div variants={itemVariants} className="bg-card border border-border p-6 rounded-xl shadow-card">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <span className="p-1.5 rounded-lg bg-success/10 text-success">🛡️</span>
            Protection
          </h3>
          <div className="flex items-center justify-between p-2">
            <div>
              <div className="text-[15px] font-semibold text-foreground">Lock past months</div>
              <div className="text-xs text-muted-foreground font-medium mt-0.5">Prevent changes to history</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.lockPastMonths}
                onChange={(e) => setLockPastMonths(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </motion.div>

        {/* Data Section */}
        <motion.div variants={itemVariants} className="bg-card border border-border p-6 rounded-xl shadow-card space-y-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-warning/10 text-warning">💾</span>
            Data Management
          </h3>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <select
                value={String(settings.exportYear)}
                onChange={(e) => setExportYear(Number(e.target.value))}
                className="w-full appearance-none bg-muted border border-border text-foreground text-sm rounded-xl focus:ring-2 focus:ring-ring/20 focus:border-primary block p-3 pr-10 hover:bg-slate-100 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-offset-1"
              >
                {Array.from({ length: 5 }).map((_, i) => {
                  const y = new Date().getFullYear() - i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
              </div>
            </div>
            <button
              onClick={handleExportYear}
              className="flex-1 bg-primary text-primary-foreground font-medium py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
            >
              Export CSV
            </button>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div variants={itemVariants} className="bg-destructive/10 border border-destructive/20 p-6 rounded-xl space-y-4">
          <h3 className="text-lg font-bold text-destructive flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-destructive/10 text-destructive">⚠️</span>
            Danger Zone
          </h3>
          <p className="text-xs text-destructive font-medium ml-1">Irreversible actions that cannot be undone.</p>
          <button
            className="w-full bg-white text-destructive border border-red-200 hover:bg-red-50 hover:border-red-300 font-semibold py-3 px-6 rounded-xl transition-colors duration-200"
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
