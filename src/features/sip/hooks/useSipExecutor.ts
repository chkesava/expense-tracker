import { useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { db } from "../../../firebase";
import { useAuth } from "../../../hooks/useAuth";
import { executeDuePlans, executeSipPlan } from "../services/sipExecutionEngine";
import type { SipPlan } from "../types";

export function useSipExecutor(plans: SipPlan[]) {
  const { user } = useAuth();
  const running = useRef(false);

  const processDueSips = useCallback(async () => {
    if (!user || running.current || plans.length === 0) return;
    running.current = true;
    try {
      const results = await executeDuePlans(db, user.uid, plans);
      const executed = results.filter((r) => r.status === "executed");
      if (executed.length === 1) {
        toast.success(executed[0].message);
      } else if (executed.length > 1) {
        toast.success(`${executed.length} virtual SIPs executed`);
      }
      const failed = results.filter((r) => r.status === "failed");
      if (failed.length > 0) {
        toast.error(`${failed.length} SIP execution(s) failed`);
      }
    } catch (err) {
      console.error("SIP catch-up failed:", err);
    } finally {
      running.current = false;
    }
  }, [user, plans]);

  const executeNow = useCallback(
    async (plan: SipPlan) => {
      if (!user) return null;
      const result = await executeSipPlan(db, user.uid, plan, { force: true });
      if (result.status === "executed") {
        toast.success(result.message);
      } else if (result.status === "already_done") {
        toast.info("Already executed for today");
      } else if (result.status === "failed") {
        toast.error(result.message);
      } else {
        toast.info(result.message);
      }
      return result;
    },
    [user]
  );

  return { processDueSips, executeNow };
}
