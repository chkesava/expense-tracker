
import useSettings from "../hooks/useSettings";
import { CATEGORIES } from "../types/expense";
import { useAuth } from "../hooks/useAuth";
import { useExpenses } from "../hooks/useExpenses";
import { exportExpensesToCSV } from "../utils/exportCsv";
import { deleteDoc, collection, getDocs, doc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";

export default function SettingsPage() {
  const { settings, setLockPastMonths, setDefaultCategory, setDefaultView, setExportYear, setMonthlyBudget } = useSettings();
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
    <main className="app-container">
      <div className="card">
        <h3 className="form-title">Profile</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
          <img src={user?.photoURL ?? ''} alt="profile" style={{ width: 56, height: 56, borderRadius: 999, objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" fill="%23737474" font-size="12" font-family="Arial" text-anchor="middle" dy=".35em">User</text></svg>'; }} />
          <div>
            <div style={{ fontWeight: 700 }}>{user?.displayName}</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>{user?.email}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 className="form-title">Preferences</h3>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>Default category</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Choose a default category for new expenses</div>
          </div>
          <select value={settings.defaultCategory} onChange={(e) => setDefaultCategory(e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>Default view</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Which page to open after sign in</div>
          </div>
          <select value={settings.defaultView} onChange={(e) => setDefaultView(e.target.value as "add" | "expenses" | "analytics" | "dashboard")}>
            <option value="add">Add expense</option>
            <option value="expenses">Expenses</option>
            <option value="analytics">Analytics</option>
            <option value="dashboard">Dashboard</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>Monthly budget</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Set a monthly budget (0 to disable)</div>
          </div>
          <input type="number" value={String(settings.monthlyBudget)} min={0} onChange={(e) => setMonthlyBudget(Number(e.target.value) || 0)} style={{ width: 120 }} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 className="form-title">Protection</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>Lock past months</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Prevent editing or deleting expenses from past months</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={settings.lockPastMonths} onChange={(e) => setLockPastMonths(e.target.checked)} />
            <span className="slider" />
          </label>
        </div>

      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 className="form-title">Data</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={String(settings.exportYear)} onChange={(e) => setExportYear(Number(e.target.value))}>
            {Array.from({length: 5}).map((_, i) => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>

          <button className="primary-btn" onClick={handleExportYear}>Export CSV</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 className="form-title">Danger Zone</h3>
        <div style={{ marginTop: 12 }}>
          <button className="small-btn danger-btn" onClick={handleDeleteAll}>Delete all data</button>
        </div>
      </div>
    </main>
  );
}
