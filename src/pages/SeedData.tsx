import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { clearDemoWorkspaceForUser, seedDemoWorkspaceForUser } from "../utils/seedData";
import { toast } from 'react-toastify';

export default function SeedDataPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [seedTag, setSeedTag] = useState<string | null>(null);

  const addSeed = async () => {
    if (!user) return setStatus("Please sign in first");
    setStatus("Seeding...");
    try {
      const res = await seedDemoWorkspaceForUser(user.uid, { months: 4 });
      setSeedTag(res.seedTag);
      setStatus(
        `Seeded demo data (tag: ${res.seedTag}): ${res.counts.accounts} accounts, ${res.counts.subscriptions} subs/EMIs, ${res.counts.trips} trip, ${res.counts.splits} split, ${res.counts.expenses} expenses.`
      );
      toast.success("Seeded demo data");
    } catch (err) {
      console.error(err);
      setStatus("Failed to seed data");
      toast.error("Failed to seed data");
    }
  };

  const clearSeed = async () => {
    if (!user) return setStatus("Please sign in first");
    const ok = window.confirm("Remove demo data? This will only remove items flagged as demo.");
    if (!ok) return;
    setStatus("Removing demo items...");
    try {
      const res = await clearDemoWorkspaceForUser(user.uid, seedTag ?? undefined);
      setStatus(
        `Deleted demo data: ${res.accounts} accounts, ${res.accountTypes} account types, ${res.subscriptions} subs/EMIs, ${res.trips} trips, ${res.splits} splits, ${res.expenses} expenses.`
      );
      setSeedTag(null);
    } catch (err) {
      console.error(err);
      setStatus("Failed to remove demo data");
      toast.error("Failed to remove demo data");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="app-container">
        <div className="card">
          <p style={{ marginBottom: 12 }}>
            This helper adds demo data across features (accounts, subscriptions/EMIs, trips, splits, expenses) and tags them so you can remove them later.
          </p>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="primary-btn" onClick={addSeed}>Seed demo data</button>
            <button className="small-btn muted-btn" onClick={clearSeed}>Remove demo data</button>
          </div>

          {status && <p style={{ marginTop: 12 }}>{status}</p>}
        </div>

        <div className="card">
          <p style={{ color: "#6b7280", fontSize: 13 }}>
            Notes: run this in the same account you use for testing. Demo entries are tagged with a `demo` flag so they can be cleared safely.
          </p>
        </div>
      </main>
    </div>
  );
}
