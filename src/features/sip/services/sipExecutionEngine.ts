import { writeBatch, type Firestore } from "firebase/firestore";
import { todayDateKey } from "../../../utils/dates";
import {
  applyExecutionToBatch,
  findExecutedTransaction,
  getVirtualPosition,
  writeSkippedOrFailed,
} from "../repositories/sipRepository";
import { computeFollowingExecutionDate, isExecutionDue } from "./sipSchedule";
import { computeWeightedAverage } from "./sipCalculations";
import { getInvestmentProvider } from "./providers";
import type { SipPlan } from "../types";

export type ExecuteResult = {
  sipId: string;
  status: "executed" | "skipped" | "failed" | "already_done" | "not_due";
  message: string;
  unitsPurchased?: number;
  marketPrice?: number;
  investmentAmount?: number;
};

export async function executeSipPlan(
  db: Firestore,
  uid: string,
  plan: SipPlan,
  options: { force?: boolean; dateKey?: string } = {}
): Promise<ExecuteResult> {
  const dateKey = options.dateKey ?? todayDateKey();
  const force = options.force === true;

  if (!force && !isExecutionDue(plan, dateKey)) {
    return { sipId: plan.id, status: "not_due", message: "SIP is not due today" };
  }

  if (await findExecutedTransaction(db, uid, plan.id, dateKey)) {
    return {
      sipId: plan.id,
      status: "already_done",
      message: "Already executed for this date",
    };
  }

  const nextAfter = computeFollowingExecutionDate(plan, dateKey);
  const completed =
    nextAfter == null || (plan.endDate != null && nextAfter > plan.endDate);

  if (plan.skipNextExecution && !force) {
    await writeSkippedOrFailed(
      db,
      uid,
      plan,
      dateKey,
      "skipped",
      `Skipped scheduled purchase of ${plan.assetName}`,
      completed ? null : nextAfter,
      true
    );
    return {
      sipId: plan.id,
      status: "skipped",
      message: "Next execution was skipped",
    };
  }

  try {
    const provider = getInvestmentProvider();
    const quote = await provider.getPrice({
      assetType: plan.assetType,
      symbol: plan.symbol,
      quoteKey: plan.quoteKey,
    });

    if (!(quote.price > 0)) {
      throw new Error("Invalid market price");
    }

    const unitsPurchased = plan.investmentAmount / quote.price;
    const position = await getVirtualPosition(db, uid, plan.quoteKey);
    const currentQty = position?.totalUnits ?? 0;
    const currentAvg = position?.averageBuyPrice ?? 0;
    const currentInvested = position?.totalInvested ?? 0;
    const averageBuyPriceAfter = computeWeightedAverage(
      currentQty,
      currentAvg,
      unitsPurchased,
      quote.price
    );
    const totalUnitsAfter = currentQty + unitsPurchased;
    const totalInvestedAfter = currentInvested + plan.investmentAmount;

    const batch = writeBatch(db);
    applyExecutionToBatch(batch, db, uid, {
      plan,
      dateKey,
      marketPrice: quote.price,
      unitsPurchased,
      investmentAmount: plan.investmentAmount,
      position,
      nextExecutionDate: completed ? plan.nextExecutionDate : nextAfter,
      status: completed ? "completed" : "active",
      averageBuyPriceAfter,
      totalUnitsAfter,
      totalInvestedAfter,
      notification: {
        type: "sip_executed",
        title: "Virtual SIP executed successfully",
        body: `₹${plan.investmentAmount.toLocaleString("en-IN")} invested into ${plan.assetName} at ₹${quote.price.toLocaleString("en-IN", { maximumFractionDigits: 4 })} · ${unitsPurchased.toFixed(4)} units added`,
        read: false,
        meta: {
          sipId: plan.id,
          amount: plan.investmentAmount,
          units: unitsPurchased,
          price: quote.price,
          symbol: plan.symbol,
        },
      },
    });

    // If completed, set nextExecutionDate stays but status completed; update next to last next if any
    if (completed) {
      // applyExecutionToBatch already sets status; ensure next stays
    } else if (nextAfter) {
      // already set
    }

    await batch.commit();

    return {
      sipId: plan.id,
      status: "executed",
      message: `Invested ₹${plan.investmentAmount} into ${plan.assetName}`,
      unitsPurchased,
      marketPrice: quote.price,
      investmentAmount: plan.investmentAmount,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to fetch market price";
    await writeSkippedOrFailed(
      db,
      uid,
      plan,
      dateKey,
      "failed",
      `Failed to execute SIP for ${plan.assetName}: ${message}`,
      force ? plan.nextExecutionDate : nextAfter,
      false
    );
    return { sipId: plan.id, status: "failed", message };
  }
}

export async function executeDuePlans(
  db: Firestore,
  uid: string,
  plans: SipPlan[],
  todayKey = todayDateKey()
): Promise<ExecuteResult[]> {
  const due = plans.filter((p) => isExecutionDue(p, todayKey));
  const results: ExecuteResult[] = [];
  for (const plan of due) {
    results.push(await executeSipPlan(db, uid, plan, { dateKey: todayKey }));
  }
  return results;
}
