
import useSettings from "../hooks/useSettings";
import { CATEGORIES } from "../types/expense";
import { useAuth } from "../hooks/useAuth";
import { useExpenses } from "../hooks/useExpenses";
import { exportExpensesToCSV } from "../utils/exportCsv";
import { deleteDoc, collection, getDocs, doc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";

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

export default function SettingsPage() {
  const { settings, setLockPastMonths, setDefaultCategory, setDefaultView, setExportYear, setMonthlyBudget, setTimezone } = useSettings();
  const { user } = useAuth();
  const expenses = useExpenses();

  const handleExportYear = () => {
    if (!user) return toast.error("Sign in to export data");

    const year = settings.exportYear;
    const filtered = expenses.filter((e) => (e.month ?? "").startsWith(String(year)));
    if (!filtered.length) return toast.info("No expenses for selected year");
    exportExpensesToCSV(filtered, `expenses-${year}.csv`);
  };

  const handleDeleteAll = async () => {
    if (!user) return toast.error("Sign in to delete data");
    const confirmation = window.prompt("Type DELETE to permanently remove all your expenses (this cannot be undone)");
    if (confirmation !== "DELETE") return;

    try {
      const colRef = collection(db, "users", user.uid, "expenses");
      const snap = await getDocs(colRef);
      const ids = snap.docs.map(d => d.id);
      for (const id of ids) {
        await deleteDoc(doc(db, "users", user.uid, "expenses", id));
      }
      toast.success(`Deleted ${ids.length} expenses`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete data");
    }
  };

  return (
    <main className="app-container page-enter">
      {/* Profile Section */}
      <div className="card hover-lift" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <img
          src={user?.photoURL ?? ''}
          alt="profile"
          style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" fill="%239ca3af" font-size="14" font-family="sans-serif" text-anchor="middle" dy=".35em">User</text></svg>'; }}
        />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{user?.displayName}</div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>{user?.email}</div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="card hover-lift">
        <h3 className="form-title">Preferences</h3>

        <div className="form-group">
          <label className="form-label">Default category</label>
          <select
            value={settings.defaultCategory}
            onChange={(e) => setDefaultCategory(e.target.value)}
            className="form-select"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Timezone</label>
          <select
            value={settings.timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="form-select"
          >
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
            {!TIMEZONES.includes(settings.timezone) && (
              <option value={settings.timezone}>{settings.timezone}</option>
            )}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Default view</label>
          <select
            value={settings.defaultView}
            onChange={(e) => setDefaultView(e.target.value as "add" | "expenses" | "analytics" | "dashboard")}
            className="form-select"
          >
            <option value="add">Add expense</option>
            <option value="expenses">Expenses</option>
            <option value="analytics">Analytics</option>
            <option value="dashboard">Dashboard</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Monthly budget</label>
          <input
            type="number"
            value={String(settings.monthlyBudget)}
            min={0}
            onChange={(e) => setMonthlyBudget(Number(e.target.value) || 0)}
            className="form-input"
            placeholder="0 to disable"
          />
        </div>
      </div>

      {/* Protection Section */}
      <div className="card hover-lift">
        <h3 className="form-title">Protection</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#1f2937' }}>Lock past months</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Prevent changes to history</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={settings.lockPastMonths} onChange={(e) => setLockPastMonths(e.target.checked)} />
            <span className="slider" />
          </label>
        </div>
      </div>

      {/* Data Section */}
      <div className="card hover-lift">
        <h3 className="form-title">Data Management</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <select
            value={String(settings.exportYear)}
            onChange={(e) => setExportYear(Number(e.target.value))}
            className="form-select"
            style={{ flex: 1 }}
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
          <button onClick={handleExportYear} className="primary-btn" style={{ flex: 1 }}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card hover-lift" style={{ border: '1px solid #fee2e2', background: 'rgba(254, 242, 242, 0.4)' }}>
        <h3 className="form-title" style={{ color: '#dc2626' }}>Danger Zone</h3>
        <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 16 }}>Irreversible actions</p>
        <button className="primary-btn danger-btn" onClick={handleDeleteAll}>
          Delete all data
        </button>
      </div>

      <div style={{ height: 80 }} /> {/* Spacer */}
    </main>
  );
}
