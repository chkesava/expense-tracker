import { addDoc, collection, deleteDoc, doc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { CATEGORIES } from "../types/expense";

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function randomFrom<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function seedDemoExpensesForUser(uid: string, months = 4) {
  if (!uid) throw new Error("No user UID");

  const seedTag = `demo-${Date.now()}`;
  const today = new Date();

  // Create roughly one expense per day for the last `months` months
  // Determine starting date: first day of (currentMonth - (months-1))
  const start = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0); // end of current month

  const docs: Promise<unknown>[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // Add a 70% chance of an expense on each day, and sometimes multiple
    const roll = Math.random();
    if (roll < 0.3) continue;

    const entries = roll < 0.6 ? 1 : 1 + Math.floor(Math.random() * 2); // 1-2 entries most days

    for (let i = 0; i < entries; i++) {
      const amount = Math.round((Math.random() * 900 + 50)); // 50 - 950
      const category = randomFrom(CATEGORIES);
      const note = Math.random() < 0.2 ? "Coffee" : Math.random() < 0.1 ? "Groceries" : "";
      const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const time = `${pad(Math.floor(Math.random() * 24))}:${pad(Math.floor(Math.random() * 60))}`;
      const month = date.slice(0, 7);

      docs.push(
        addDoc(collection(db, "users", uid, "expenses"), {
          amount,
          date,
          time,
          category,
          note,
          month,
          demo: true,
          demoTag: seedTag,
          createdAt: serverTimestamp(),
        })
      );
    }
  }

  await Promise.all(docs);

  return { seedTag, count: docs.length };
}

export async function clearDemoExpensesForUser(uid: string, seedTag?: string) {
  if (!uid) throw new Error("No user UID");

  // Query for demo flagged docs (optionally filter by seedTag)
  const q = seedTag
    ? query(collection(db, "users", uid, "expenses"), where("demoTag", "==", seedTag))
    : query(collection(db, "users", uid, "expenses"), where("demo", "==", true));

  const snap = await getDocs(q);
  const promises: Promise<unknown>[] = [];
  snap.docs.forEach((d) => promises.push(deleteDoc(doc(db, "users", uid, "expenses", d.id))));
  await Promise.all(promises);

  return { deleted: promises.length };
}
