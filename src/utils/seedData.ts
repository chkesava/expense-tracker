import { addDoc, collection, deleteDoc, doc, getDocs, query, where, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { CATEGORIES } from "../types/expense";
import { toLocalDateKey, todayDateKey } from "./dates";

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function randomFrom<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

type SeedExpenseOptions = {
  months?: number;
  seedTag?: string;
  accountIds?: string[];
  tripId?: string;
  splitId?: string;
};

type SeedSummary = {
  seedTag: string;
  counts: {
    accountTypes: number;
    accounts: number;
    subscriptions: number;
    trips: number;
    splits: number;
    expenses: number;
  };
};

function isSeededDocMatch(d: { demo?: boolean; demoTag?: string }, seedTag?: string) {
  if (seedTag) return d.demoTag === seedTag;
  return d.demo === true;
}

export async function seedDemoExpensesForUser(uid: string, monthsOrOptions: number | SeedExpenseOptions = 4) {
  if (!uid) throw new Error("No user UID");

  const options: SeedExpenseOptions = typeof monthsOrOptions === "number" ? { months: monthsOrOptions } : monthsOrOptions;
  const months = options.months ?? 4;
  const seedTag = options.seedTag ?? `demo-${Date.now()}`;
  const today = new Date();

  // Create roughly one expense per day for the last `months` months
  // Determine starting date: first day of (currentMonth - (months-1))
  const start = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0); // end of current month

  const docs: Promise<unknown>[] = [];
  const accountIds = options.accountIds?.filter(Boolean) ?? [];

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
      const accountId = accountIds.length && Math.random() < 0.85 ? randomFrom(accountIds) : undefined;
      const tripId = options.tripId && Math.random() < 0.22 ? options.tripId : undefined;
      const splitId = options.splitId && Math.random() < 0.1 ? options.splitId : undefined;

      docs.push(
        addDoc(collection(db, "users", uid, "expenses"), {
          amount,
          date,
          time,
          category,
          note,
          month,
          ...(accountId ? { accountId } : {}),
          ...(tripId ? { tripId } : {}),
          ...(splitId ? { splitId } : {}),
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

export async function seedDemoWorkspaceForUser(uid: string, options: { months?: number } = {}): Promise<SeedSummary> {
  if (!uid) throw new Error("No user UID");

  const seedTag = `demo-${Date.now()}`;

  // 1) Account types
  const accountTypeNames = ["Savings", "Checking", "Credit Card", "Cash"] as const;
  const accountTypeRefs = await Promise.all(
    accountTypeNames.map((name) =>
      addDoc(collection(db, "users", uid, "accountTypes"), {
        name,
        demo: true,
        demoTag: seedTag,
        createdAt: serverTimestamp(),
      })
    )
  );
  const accountTypeIdByName = new Map<string, string>();
  accountTypeNames.forEach((n, idx) => accountTypeIdByName.set(n, accountTypeRefs[idx].id));

  // 2) Accounts
  const accountsToCreate: Array<{
    name: string;
    typeName: (typeof accountTypeNames)[number];
    openingBalance?: number;
    balanceInitialized?: boolean;
    creditLimit?: number;
    billGenerationDay?: number;
  }> = [
    { name: "HDFC Savings", typeName: "Savings", openingBalance: 50000, balanceInitialized: true },
    { name: "ICICI Checking", typeName: "Checking", openingBalance: 12000, balanceInitialized: true },
    { name: "SBI Cash", typeName: "Cash" },
    { name: "Axis Credit Card", typeName: "Credit Card", creditLimit: 150000, billGenerationDay: 5 },
  ];

  const accountRefs = await Promise.all(
    accountsToCreate.map((a) =>
      addDoc(collection(db, "users", uid, "accounts"), {
        name: a.name,
        typeId: accountTypeIdByName.get(a.typeName)!,
        ...(a.openingBalance != null ? { openingBalance: a.openingBalance } : {}),
        ...(a.balanceInitialized != null ? { balanceInitialized: a.balanceInitialized } : {}),
        ...(a.balanceInitialized ? { balanceAsOfDate: todayDateKey() } : {}),
        ...(a.creditLimit != null ? { creditLimit: a.creditLimit } : {}),
        ...(a.billGenerationDay != null ? { billGenerationDay: a.billGenerationDay } : {}),
        demo: true,
        demoTag: seedTag,
        createdAt: serverTimestamp(),
      })
    )
  );
  const accountIds = accountRefs.map((r) => r.id);

  // 3) Subscriptions / EMIs
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const subsToCreate = [
    { name: "Netflix", amount: 199, category: "Subscriptions", dayOfMonth: 6, type: "subscription" as const },
    { name: "Spotify", amount: 119, category: "Subscriptions", dayOfMonth: 12, type: "subscription" as const },
    { name: "Phone EMI", amount: 2499, category: "EMIS", dayOfMonth: 2, type: "emi" as const, endMonth: ((now.getMonth() + 1 + 10 - 1) % 12) + 1, endYear: now.getFullYear() + (now.getMonth() + 1 + 10 > 12 ? 1 : 0) },
  ];

  const subscriptionRefs = await Promise.all(
    subsToCreate.map((s, idx) =>
      addDoc(collection(db, "users", uid, "subscriptions"), {
        ...s,
        isActive: true,
        isCompleted: false,
        lastProcessed: "",
        accountId: accountIds[idx % accountIds.length] ?? "",
        demo: true,
        demoTag: seedTag,
        createdAt: serverTimestamp(),
      })
    )
  );

  // 4) Trips
  const startDate = toLocalDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10));
  const endDate = toLocalDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14));

  const tripRef = await addDoc(collection(db, "trips"), {
    destination: "Goa",
    tripName: "Goa Getaway",
    startDate,
    endDate,
    totalBudget: 35000,
    spentAmount: 0,
    status: "active",
    userId: uid,
    demo: true,
    demoTag: seedTag,
    createdAt: serverTimestamp(),
  });

  const tripCategoryBudgets = [
    { category: "Food", limit: 8000 },
    { category: "Travel", limit: 12000 },
    { category: "Entertainment", limit: 7000 },
  ];
  const tripBatch = writeBatch(db);
  tripCategoryBudgets.forEach((cb) => {
    const cbRef = doc(collection(db, `trips/${tripRef.id}/categoryBudgets`));
    tripBatch.set(cbRef, { ...cb, demo: true, demoTag: seedTag });
  });
  await tripBatch.commit();

  // 5) Splits
  const splitRef = await addDoc(collection(db, "splits"), {
    title: "Dinner at BBQ Nation",
    totalAmount: 1800,
    splitType: "custom",
    category: "Food",
    participants: [
      { name: "You", amount: 900, paid: true, isCurrentUser: true, userId: uid },
      { name: "A Friend", amount: 900, paid: false, isCurrentUser: false, upiId: "friend@upi" },
    ],
    createdBy: uid,
    createdByName: "Demo User",
    createdAt: Date.now(),
    settled: false,
    participantIds: [uid],
    demo: true,
    demoTag: seedTag,
  });

  // 6) Expenses (linked to accounts / trip / split)
  const expenseRes = await seedDemoExpensesForUser(uid, { months: options.months ?? 4, seedTag, accountIds, tripId: tripRef.id, splitId: splitRef.id });

  // Also add a couple of "fromSubscription" expenses for the current month
  const extraExpenseAdds: Promise<unknown>[] = [];
  subscriptionRefs.forEach((sub, idx) => {
    const subDef = subsToCreate[idx];
    extraExpenseAdds.push(
      addDoc(collection(db, "users", uid, "expenses"), {
        amount: subDef.amount,
        category: subDef.category,
        note: `${subDef.name} (Auto-subscription)`,
        date: todayDateKey(),
        month: currentMonth,
        time: `${pad(Math.floor(Math.random() * 24))}:${pad(Math.floor(Math.random() * 60))}`,
        createdAt: serverTimestamp(),
        fromSubscription: true,
        subscriptionId: sub.id,
        accountId: accountIds[idx % accountIds.length] ?? "",
        demo: true,
        demoTag: seedTag,
      })
    );
  });
  await Promise.all(extraExpenseAdds);

  return {
    seedTag,
    counts: {
      accountTypes: accountTypeRefs.length,
      accounts: accountRefs.length,
      subscriptions: subscriptionRefs.length,
      trips: 1,
      splits: 1,
      expenses: expenseRes.count + extraExpenseAdds.length,
    },
  };
}

export async function clearDemoWorkspaceForUser(uid: string, seedTag?: string) {
  if (!uid) throw new Error("No user UID");

  const results = {
    accountTypes: 0,
    accounts: 0,
    subscriptions: 0,
    trips: 0,
    tripBudgets: 0,
    splits: 0,
    expenses: 0,
  };

  // Expenses
  const expenseRes = await clearDemoExpensesForUser(uid, seedTag);
  results.expenses = expenseRes.deleted;

  // Account types
  for (const col of ["accountTypes", "accounts", "subscriptions"] as const) {
    const q = seedTag
      ? query(collection(db, "users", uid, col), where("demoTag", "==", seedTag))
      : query(collection(db, "users", uid, col), where("demo", "==", true));
    const snap = await getDocs(q);
    const promises: Promise<unknown>[] = [];
    snap.docs.forEach((d) => promises.push(deleteDoc(d.ref)));
    await Promise.all(promises);
    if (col === "accountTypes") results.accountTypes = promises.length;
    if (col === "accounts") results.accounts = promises.length;
    if (col === "subscriptions") results.subscriptions = promises.length;
  }

  // Trips (top-level) + their categoryBudgets subcollection
  const tripsQ = seedTag
    ? query(collection(db, "trips"), where("demoTag", "==", seedTag))
    : query(collection(db, "trips"), where("demo", "==", true));
  const tripsSnap = await getDocs(tripsQ);
  for (const t of tripsSnap.docs) {
    const data = t.data() as any;
    if (data.userId !== uid) continue;

    const budgetsSnap = await getDocs(collection(db, `trips/${t.id}/categoryBudgets`));
    const batch = writeBatch(db);
    budgetsSnap.docs.forEach((b) => {
      const bd = b.data() as any;
      if (!isSeededDocMatch(bd, seedTag)) return;
      batch.delete(b.ref);
      results.tripBudgets += 1;
    });
    batch.delete(t.ref);
    results.trips += 1;
    await batch.commit();
  }

  // Splits (top-level) - fetch demo splits and filter by participantIds
  const splitsQ = seedTag
    ? query(collection(db, "splits"), where("demoTag", "==", seedTag))
    : query(collection(db, "splits"), where("demo", "==", true));
  const splitsSnap = await getDocs(splitsQ);
  const splitDeletes: Promise<unknown>[] = [];
  splitsSnap.docs.forEach((s) => {
    const d = s.data() as any;
    const participantIds: unknown = d.participantIds;
    const hasUser = Array.isArray(participantIds) ? participantIds.includes(uid) : d.createdBy === uid;
    if (!hasUser) return;
    splitDeletes.push(deleteDoc(s.ref));
  });
  await Promise.all(splitDeletes);
  results.splits = splitDeletes.length;

  return results;
}
