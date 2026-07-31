import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
  type WriteBatch,
} from "firebase/firestore";
import type {
  AppNotification,
  SipPlan,
  SipTransaction,
  VirtualPosition,
} from "../types";
import { virtualPositionDocId } from "../services/sipCalculations";

function plansCol(db: Firestore, uid: string) {
  return collection(db, "users", uid, "sipPlans");
}
function txCol(db: Firestore, uid: string) {
  return collection(db, "users", uid, "sipTransactions");
}
function portfolioCol(db: Firestore, uid: string) {
  return collection(db, "users", uid, "virtualPortfolio");
}
function notifCol(db: Firestore, uid: string) {
  return collection(db, "users", uid, "notifications");
}

export async function createSipPlan(
  db: Firestore,
  uid: string,
  data: Omit<SipPlan, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(plansCol(db, uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSipPlan(
  db: Firestore,
  uid: string,
  id: string,
  patch: Partial<SipPlan>
): Promise<void> {
  const { id: _id, createdAt: _c, ...rest } = patch as SipPlan;
  await updateDoc(doc(db, "users", uid, "sipPlans", id), {
    ...rest,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSipPlan(db: Firestore, uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "sipPlans", id));
}

export async function getSipPlan(
  db: Firestore,
  uid: string,
  id: string
): Promise<SipPlan | null> {
  const snap = await getDoc(doc(db, "users", uid, "sipPlans", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<SipPlan, "id">) };
}

export async function findExecutedTransaction(
  db: Firestore,
  uid: string,
  sipId: string,
  dateKey: string
): Promise<boolean> {
  const q = query(
    txCol(db, uid),
    where("sipId", "==", sipId),
    where("date", "==", dateKey),
    where("status", "==", "executed")
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function getVirtualPosition(
  db: Firestore,
  uid: string,
  quoteKey: string
): Promise<VirtualPosition | null> {
  const id = virtualPositionDocId(quoteKey);
  const snap = await getDoc(doc(db, "users", uid, "virtualPortfolio", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<VirtualPosition, "id">) };
}

export function applyExecutionToBatch(
  batch: WriteBatch,
  db: Firestore,
  uid: string,
  args: {
    plan: SipPlan;
    dateKey: string;
    marketPrice: number;
    unitsPurchased: number;
    investmentAmount: number;
    position: VirtualPosition | null;
    nextExecutionDate: string | null;
    status: SipPlan["status"];
    averageBuyPriceAfter: number;
    totalUnitsAfter: number;
    totalInvestedAfter: number;
    notification: Omit<AppNotification, "id" | "createdAt">;
  }
) {
  const txRef = doc(txCol(db, uid));
  const tx: Omit<SipTransaction, "id" | "createdAt"> = {
    sipId: args.plan.id,
    date: args.dateKey,
    assetType: args.plan.assetType,
    symbol: args.plan.symbol,
    quoteKey: args.plan.quoteKey,
    assetName: args.plan.assetName,
    marketPrice: args.marketPrice,
    investmentAmount: args.investmentAmount,
    unitsPurchased: args.unitsPurchased,
    totalUnitsAfterPurchase: args.totalUnitsAfter,
    averageBuyPriceAfter: args.averageBuyPriceAfter,
    status: "executed",
  };
  batch.set(txRef, { ...tx, createdAt: serverTimestamp() });

  const posId = virtualPositionDocId(args.plan.quoteKey);
  const posRef = doc(db, "users", uid, "virtualPortfolio", posId);
  const sipIds = new Set(args.position?.sipIds ?? []);
  sipIds.add(args.plan.id);
  batch.set(
    posRef,
    {
      assetType: args.plan.assetType,
      symbol: args.plan.symbol,
      quoteKey: args.plan.quoteKey,
      assetName: args.plan.assetName,
      totalUnits: args.totalUnitsAfter,
      averageBuyPrice: args.averageBuyPriceAfter,
      totalInvested: args.totalInvestedAfter,
      sipIds: [...sipIds],
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const planRef = doc(db, "users", uid, "sipPlans", args.plan.id);
  batch.update(planRef, {
    totalInvested: args.totalInvestedAfter,
    totalUnits: args.totalUnitsAfter,
    executionCount: (args.plan.executionCount ?? 0) + 1,
    lastExecutionDate: args.dateKey,
    nextExecutionDate: args.nextExecutionDate ?? args.plan.nextExecutionDate,
    skipNextExecution: false,
    status: args.status,
    updatedAt: serverTimestamp(),
  });

  const notifRef = doc(notifCol(db, uid));
  batch.set(notifRef, {
    ...args.notification,
    createdAt: serverTimestamp(),
  });
}

export async function writeSkippedOrFailed(
  db: Firestore,
  uid: string,
  plan: SipPlan,
  dateKey: string,
  status: "skipped" | "failed",
  message: string,
  nextExecutionDate: string | null,
  clearSkip: boolean
) {
  await addDoc(txCol(db, uid), {
    sipId: plan.id,
    date: dateKey,
    assetType: plan.assetType,
    symbol: plan.symbol,
    quoteKey: plan.quoteKey,
    assetName: plan.assetName,
    marketPrice: 0,
    investmentAmount: 0,
    unitsPurchased: 0,
    totalUnitsAfterPurchase: plan.totalUnits,
    averageBuyPriceAfter:
      plan.totalUnits > 0 ? plan.totalInvested / plan.totalUnits : 0,
    status,
    message,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "users", uid, "sipPlans", plan.id), {
    nextExecutionDate: nextExecutionDate ?? plan.nextExecutionDate,
    skipNextExecution: clearSkip ? false : plan.skipNextExecution,
    status:
      nextExecutionDate == null && plan.status === "active" ? "completed" : plan.status,
    updatedAt: serverTimestamp(),
  });

  if (status === "failed" || status === "skipped") {
    await addDoc(notifCol(db, uid), {
      type: status === "failed" ? "sip_failed" : "sip_skipped",
      title: status === "failed" ? "Virtual SIP failed" : "Virtual SIP skipped",
      body: message,
      read: false,
      meta: { sipId: plan.id, symbol: plan.symbol },
      createdAt: serverTimestamp(),
    });
  }
}

export async function createNotification(
  db: Firestore,
  uid: string,
  data: Omit<AppNotification, "id" | "createdAt">
) {
  await addDoc(notifCol(db, uid), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export { setDoc, virtualPositionDocId };
