import { useCallback, useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import { toast } from "../../../lib/toast";
import { db } from "../../../firebase";
import { useAuth } from "../../../hooks/useAuth";
import {
  createSipPlan,
  deleteSipPlan,
  updateSipPlan,
} from "../repositories/sipRepository";
import { computeNextExecutionDate } from "../services/sipSchedule";
import { todayDateKey } from "../../../utils/dates";
import type { SipPlanFormInput } from "../schemas";
import type { SipPlan, SipStatus } from "../types";

export function useSipPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SipPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPlans([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "users", user.uid, "sipPlans"),
      orderBy("createdAt", "desc")
    );
    const unsub: Unsubscribe = onSnapshot(
      q,
      (snap) => {
        setPlans(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SipPlan, "id">) }))
        );
        setLoading(false);
      },
      (err) => {
        console.error("sipPlans snapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const addPlan = useCallback(
    async (input: SipPlanFormInput) => {
      if (!user) return null;
      const today = todayDateKey();
      const from = input.startDate > today ? input.startDate : today;
      const next =
        computeNextExecutionDate(
          {
            frequency: input.frequency,
            executionDay: input.executionDay,
            startDate: input.startDate,
            endDate: input.endDate || undefined,
          },
          from
        ) ?? input.startDate;

      const id = await createSipPlan(db, user.uid, {
        assetType: input.assetType,
        symbol: input.symbol,
        quoteKey: input.quoteKey,
        assetName: input.assetName,
        investmentAmount: input.investmentAmount,
        currency: input.currency || "INR",
        frequency: input.frequency,
        executionDay: input.executionDay,
        startDate: input.startDate,
        endDate: input.endDate || undefined,
        status: "active",
        nextExecutionDate: next,
        skipNextExecution: false,
        totalInvested: 0,
        totalUnits: 0,
        executionCount: 0,
      });
      toast.success("Virtual SIP created");
      return id;
    },
    [user]
  );

  const editPlan = useCallback(
    async (id: string, input: SipPlanFormInput) => {
      if (!user) return;
      const existing = plans.find((p) => p.id === id);
      const next =
        computeNextExecutionDate(
          {
            frequency: input.frequency,
            executionDay: input.executionDay,
            startDate: input.startDate,
            endDate: input.endDate || undefined,
          },
          todayDateKey()
        ) ?? input.startDate;

      await updateSipPlan(db, user.uid, id, {
        assetType: input.assetType,
        symbol: input.symbol,
        quoteKey: input.quoteKey,
        assetName: input.assetName,
        investmentAmount: input.investmentAmount,
        currency: input.currency || "INR",
        frequency: input.frequency,
        executionDay: input.executionDay,
        startDate: input.startDate,
        endDate: input.endDate || undefined,
        nextExecutionDate:
          existing?.status === "active" ? next : existing?.nextExecutionDate,
      });
      toast.success("SIP updated");
    },
    [user, plans]
  );

  const setStatus = useCallback(
    async (id: string, status: SipStatus) => {
      if (!user) return;
      const plan = plans.find((p) => p.id === id);
      const patch: Partial<SipPlan> = { status };
      if (status === "active" && plan) {
        patch.nextExecutionDate =
          computeNextExecutionDate(plan, todayDateKey()) ?? plan.nextExecutionDate;
      }
      await updateSipPlan(db, user.uid, id, patch);
      toast.success(
        status === "paused"
          ? "SIP paused"
          : status === "active"
            ? "SIP resumed"
            : `SIP ${status}`
      );
    },
    [user, plans]
  );

  const skipNext = useCallback(
    async (id: string) => {
      if (!user) return;
      await updateSipPlan(db, user.uid, id, { skipNextExecution: true });
      toast.info("Next SIP execution will be skipped");
    },
    [user]
  );

  const removePlan = useCallback(
    async (id: string) => {
      if (!user) return;
      await deleteSipPlan(db, user.uid, id);
      toast.success("SIP deleted");
    },
    [user]
  );

  return {
    plans,
    loading,
    addPlan,
    editPlan,
    setStatus,
    skipNext,
    removePlan,
  };
}
