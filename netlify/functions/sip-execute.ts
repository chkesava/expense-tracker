import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { ipv4Fetch } from "./_ipv4";

const JSON_HEADERS = { "Content-Type": "application/json" };

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: JSON_HEADERS });
}

function todayKeyUTC(): string {
  // Cron runs 03:00 UTC ≈ morning IST; use Asia/Kolkata calendar day for personal India use
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

function weightedAvg(qty: number, avg: number, buyQty: number, buyPrice: number) {
  const total = qty + buyQty;
  if (total <= 0) return 0;
  return (qty * avg + buyQty * buyPrice) / total;
}

function positionId(quoteKey: string) {
  return quoteKey.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 700);
}

async function fetchPrice(assetType: string, symbol: string, quoteKey: string) {
  if (assetType === "mutual_fund") {
    const code = quoteKey.replace(/^MF:/i, "") || symbol;
    const res = await ipv4Fetch(`https://api.mfapi.in/mf/${encodeURIComponent(code)}/latest`);
    if (!res.ok) throw new Error("MF quote failed");
    const payload: any = await res.json();
    const nav = Number.parseFloat(String(payload?.data?.[0]?.nav ?? ""));
    if (!Number.isFinite(nav) || nav <= 0) throw new Error("Invalid NAV");
    return { price: nav, name: payload?.meta?.scheme_name || symbol };
  }
  if (assetType === "crypto") {
    const id = quoteKey.replace(/^CRYPTO:/i, "").toLowerCase() || symbol.toLowerCase();
    const res = await ipv4Fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=inr`
    );
    if (!res.ok) throw new Error("Crypto quote failed");
    const payload: any = await res.json();
    const price = payload?.[id]?.inr;
    if (typeof price !== "number" || price <= 0) throw new Error("Invalid crypto price");
    return { price, name: id };
  }

  // Stocks / ETFs via Yahoo chart API (no yahoo-finance2 in this function)
  let ticker = (quoteKey || symbol).toUpperCase();
  if (!ticker.includes(".") && !["AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "QQQ", "SPY"].includes(ticker)) {
    ticker = `${ticker}.NS`;
  }
  const res = await ipv4Fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`
  );
  if (!res.ok) throw new Error("Stock quote failed");
  const payload: any = await res.json();
  const meta = payload?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (typeof price !== "number" || price <= 0) throw new Error("Invalid stock price");
  return { price, name: meta?.shortName || meta?.symbol || ticker };
}

function addDaysKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function nextExecution(plan: any, afterKey: string): string | null {
  // Lightweight advance: daily +1; weekly +7 from next weekday match; monthly bump
  const from = addDaysKey(afterKey, 1);
  const freq = plan.frequency;
  if (freq === "daily") {
    if (plan.endDate && from > plan.endDate) return null;
    return from;
  }
  if (freq === "weekly") {
    const [y, m, d] = from.split("-").map(Number);
    let dt = new Date(y, m - 1, d);
    while (dt.getDay() !== plan.executionDay) dt.setDate(dt.getDate() + 1);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    if (plan.endDate && key > plan.endDate) return null;
    return key;
  }
  // monthly / quarterly / yearly — advance months
  const months = freq === "quarterly" ? 3 : freq === "yearly" ? 12 : 1;
  const [y, m] = afterKey.split("-").map(Number);
  let year = y;
  let month = m - 1 + months;
  while (month > 11) {
    month -= 12;
    year += 1;
  }
  const last = new Date(year, month + 1, 0).getDate();
  const day = plan.executionDay === 31 ? last : Math.min(plan.executionDay || 1, last);
  const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (plan.endDate && key > plan.endDate) return null;
  return key;
}

export default async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
  // Netlify scheduled invocations include a special header; also allow CRON_SECRET
  const isScheduled = req.headers.get("x-netlify-event") === "schedule";
  if (secret && header !== secret && !isScheduled) {
    return json({ success: false, message: "Unauthorized" }, 401);
  }
  if (!secret && !isScheduled && header !== "dev") {
    // Allow local manual testing without secret only when no CRON_SECRET configured
  }

  const app = initAdmin();
  if (!app) {
    return json(
      {
        success: false,
        message:
          "FIREBASE_SERVICE_ACCOUNT_JSON is not configured. Client catch-up still executes SIPs when users open the app.",
      },
      503
    );
  }

  const db = getFirestore(app);
  const today = todayKeyUTC();

  try {
    const snap = await db
      .collectionGroup("sipPlans")
      .where("status", "==", "active")
      .where("nextExecutionDate", "<=", today)
      .get();

    const results: { sipId: string; status: string; message: string }[] = [];

    for (const docSnap of snap.docs) {
      const plan = { id: docSnap.id, ...docSnap.data() } as any;
      const userRef = docSnap.ref.parent.parent;
      if (!userRef) continue;
      const uid = userRef.id;

      // Idempotency
      const existing = await db
        .collection("users")
        .doc(uid)
        .collection("sipTransactions")
        .where("sipId", "==", plan.id)
        .where("date", "==", today)
        .where("status", "==", "executed")
        .limit(1)
        .get();
      if (!existing.empty) {
        results.push({ sipId: plan.id, status: "already_done", message: "Already executed" });
        continue;
      }

      const next = nextExecution(plan, today);
      const completed = next == null;

      if (plan.skipNextExecution) {
        await db.collection("users").doc(uid).collection("sipTransactions").add({
          sipId: plan.id,
          date: today,
          assetType: plan.assetType,
          symbol: plan.symbol,
          quoteKey: plan.quoteKey,
          assetName: plan.assetName,
          marketPrice: 0,
          investmentAmount: 0,
          unitsPurchased: 0,
          totalUnitsAfterPurchase: plan.totalUnits ?? 0,
          averageBuyPriceAfter: 0,
          status: "skipped",
          message: "Skipped by user",
          createdAt: FieldValue.serverTimestamp(),
        });
        await docSnap.ref.update({
          skipNextExecution: false,
          nextExecutionDate: next ?? plan.nextExecutionDate,
          status: completed ? "completed" : "active",
          updatedAt: FieldValue.serverTimestamp(),
        });
        results.push({ sipId: plan.id, status: "skipped", message: "Skipped" });
        continue;
      }

      try {
        const quote = await fetchPrice(plan.assetType, plan.symbol, plan.quoteKey);
        const units = plan.investmentAmount / quote.price;
        const posId = positionId(plan.quoteKey);
        const posRef = db.collection("users").doc(uid).collection("virtualPortfolio").doc(posId);
        const posSnap = await posRef.get();
        const pos = posSnap.exists ? posSnap.data()! : null;
        const qty = pos?.totalUnits ?? 0;
        const avg = pos?.averageBuyPrice ?? 0;
        const invested = pos?.totalInvested ?? 0;
        const newAvg = weightedAvg(qty, avg, units, quote.price);
        const newQty = qty + units;
        const newInvested = invested + plan.investmentAmount;
        const sipIds = new Set<string>(pos?.sipIds ?? []);
        sipIds.add(plan.id);

        const batch = db.batch();
        const txRef = db.collection("users").doc(uid).collection("sipTransactions").doc();
        batch.set(txRef, {
          sipId: plan.id,
          date: today,
          assetType: plan.assetType,
          symbol: plan.symbol,
          quoteKey: plan.quoteKey,
          assetName: plan.assetName,
          marketPrice: quote.price,
          investmentAmount: plan.investmentAmount,
          unitsPurchased: units,
          totalUnitsAfterPurchase: newQty,
          averageBuyPriceAfter: newAvg,
          status: "executed",
          createdAt: FieldValue.serverTimestamp(),
        });
        batch.set(
          posRef,
          {
            assetType: plan.assetType,
            symbol: plan.symbol,
            quoteKey: plan.quoteKey,
            assetName: plan.assetName,
            totalUnits: newQty,
            averageBuyPrice: newAvg,
            totalInvested: newInvested,
            sipIds: [...sipIds],
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        batch.update(docSnap.ref, {
          totalInvested: newInvested,
          totalUnits: newQty,
          executionCount: (plan.executionCount ?? 0) + 1,
          lastExecutionDate: today,
          nextExecutionDate: next ?? plan.nextExecutionDate,
          skipNextExecution: false,
          status: completed ? "completed" : "active",
          updatedAt: FieldValue.serverTimestamp(),
        });
        const notifRef = db.collection("users").doc(uid).collection("notifications").doc();
        batch.set(notifRef, {
          type: "sip_executed",
          title: "Virtual SIP executed successfully",
          body: `₹${plan.investmentAmount} invested into ${plan.assetName} at ₹${quote.price} · ${units.toFixed(4)} units added`,
          read: false,
          meta: {
            sipId: plan.id,
            amount: plan.investmentAmount,
            units,
            price: quote.price,
            symbol: plan.symbol,
          },
          createdAt: FieldValue.serverTimestamp(),
        });
        await batch.commit();
        results.push({ sipId: plan.id, status: "executed", message: "OK" });
      } catch (err: any) {
        console.error(`SIP execute failed for ${plan.id}:`, err?.message || err);
        results.push({
          sipId: plan.id,
          status: "failed",
          message: err?.message || "failed",
        });
      }
    }

    return json({
      success: true,
      date: today,
      processed: results.length,
      results,
    });
  } catch (err: any) {
    console.error("sip-execute error:", err?.message || err);
    return json(
      { success: false, message: "SIP scheduler failed. Client catch-up remains available." },
      502
    );
  }
};
