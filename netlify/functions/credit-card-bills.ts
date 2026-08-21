import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import {
  computeCreditCardBillStatus,
  planCreditCardBillJobs,
  todayDateKey,
  type AccountSlice,
  type BillSlice,
  type ExpenseSlice,
} from "./_ccBills/core";

const JSON_HEADERS = { "Content-Type": "application/json" };

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: JSON_HEADERS });
}

function initAdmin(): App | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const cred = JSON.parse(raw);
    if (getApps().length) return getApps()[0]!;
    return initializeApp({ credential: cert(cred) });
  } catch (err) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON", err);
    return null;
  }
}

function isScheduled(req: Request): boolean {
  return req.headers.get("x-netlify-event") === "schedule";
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header =
    req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
  if (isScheduled(req)) return true;
  if (secret) return header === secret;
  return header === "dev";
}

export default async (req: Request) => {
  if (!isAuthorized(req)) {
    return json({ success: false, message: "Unauthorized" }, 401);
  }

  const app = initAdmin();
  if (!app) {
    return json(
      {
        success: false,
        message:
          "FIREBASE_SERVICE_ACCOUNT_JSON is not configured. The mobile app still creates statements when it opens.",
      },
      503
    );
  }

  const db = getFirestore(app);
  const results: {
    uid: string;
    created: number;
    refreshed: number;
    skipped?: string;
  }[] = [];

  try {
    const usersSnap = await db.collection("users").get();

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      if (uid.endsWith("_duress")) {
        results.push({ uid, created: 0, refreshed: 0, skipped: "duress" });
        continue;
      }

      const user = userDoc.data() || {};
      const timezone =
        typeof user.timezone === "string" && user.timezone
          ? user.timezone
          : "Asia/Kolkata";
      const currency =
        typeof user.currency === "string" && user.currency ? user.currency : "INR";
      const today = todayDateKey(timezone);

      const [accountsSnap, typesSnap, expensesSnap, billsSnap] = await Promise.all([
        db.collection("users").doc(uid).collection("accounts").get(),
        db.collection("users").doc(uid).collection("accountTypes").get(),
        db.collection("users").doc(uid).collection("expenses").get(),
        db.collection("users").doc(uid).collection("creditCardBills").get(),
      ]);

      const typeNameById = new Map(
        typesSnap.docs.map((docSnap) => {
          const data = docSnap.data() as { name?: string };
          return [docSnap.id, data.name || ""];
        })
      );
      const accounts: AccountSlice[] = accountsSnap.docs.map((docSnap) => {
        const data = docSnap.data() as AccountSlice;
        return {
          id: docSnap.id,
          typeId: data.typeId,
          billGenerationDay: data.billGenerationDay,
        };
      });
      const expenses: ExpenseSlice[] = expensesSnap.docs.map((docSnap) => {
        const data = docSnap.data() as ExpenseSlice;
        return {
          accountId: data.accountId,
          date: data.date,
          amount: Number(data.amount) || 0,
        };
      });
      const existingBills: BillSlice[] = billsSnap.docs.map((docSnap) => {
        const data = docSnap.data() as Omit<BillSlice, "id">;
        return { id: docSnap.id, ...data };
      });

      const { drafts, patches } = planCreditCardBillJobs({
        accounts,
        typeNameById,
        expenses,
        existingBills,
        today,
      });

      let created = 0;
      for (const draft of drafts) {
        const amountPaid = 0;
        const remainingAmount = draft.statementAmount;
        const status = computeCreditCardBillStatus({
          today,
          dueDate: draft.dueDate,
          amountPaid,
          statementAmount: draft.statementAmount,
        });
        const billRef = db
          .collection("users")
          .doc(uid)
          .collection("creditCardBills")
          .doc();
        await billRef.set({
          accountId: draft.accountId,
          billingPeriodStart: draft.billingPeriodStart,
          billingPeriodEnd: draft.billingPeriodEnd,
          statementDate: draft.statementDate,
          dueDate: draft.dueDate,
          statementAmount: draft.statementAmount,
          minimumDueAmount: draft.minimumDueAmount,
          amountPaid,
          remainingAmount,
          currency,
          status,
          note: draft.note,
          reminderEnabled: true,
          reminderFrequency: {
            daysBefore: [3, 1],
            onDueDate: true,
            overdueEveryDays: 1,
          },
          paymentIds: [],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        created += 1;
      }

      let refreshed = 0;
      for (const patch of patches) {
        const existing = existingBills.find((bill) => bill.id === patch.billId);
        const amountPaid = Math.max(0, Number(existing?.amountPaid) || 0);
        const remainingAmount = Math.max(0, patch.statementAmount - amountPaid);
        const status = computeCreditCardBillStatus({
          today,
          dueDate: patch.dueDate,
          amountPaid,
          statementAmount: patch.statementAmount,
        });
        await db
          .collection("users")
          .doc(uid)
          .collection("creditCardBills")
          .doc(patch.billId)
          .update({
            statementAmount: patch.statementAmount,
            minimumDueAmount: patch.minimumDueAmount,
            statementDate: patch.statementDate,
            billingPeriodStart: patch.billingPeriodStart,
            billingPeriodEnd: patch.billingPeriodEnd,
            dueDate: patch.dueDate,
            remainingAmount,
            status,
            updatedAt: FieldValue.serverTimestamp(),
          });
        refreshed += 1;
      }

      if (created > 0) {
        await db.collection("users").doc(uid).collection("notifications").add({
          type: "credit_card_statement",
          title:
            created === 1
              ? "Credit card statement created"
              : `${created} credit card statements created`,
          body: "A billing cycle closed. Open Cards to review the statement.",
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      results.push({ uid, created, refreshed });
    }

    return json({
      success: true,
      processed: results.length,
      created: results.reduce((sum, row) => sum + row.created, 0),
      refreshed: results.reduce((sum, row) => sum + row.refreshed, 0),
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("credit-card-bills cron failed:", message);
    return json(
      {
        success: false,
        message:
          "Credit card statement cron failed. The mobile app still creates statements when it opens.",
      },
      502
    );
  }
};
