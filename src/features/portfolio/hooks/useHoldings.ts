import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { db } from "../../../firebase";
import type { Holding } from "../types";
import { useAuth } from "../../../hooks/useAuth";
import { computeWeightedAverage } from "../services/portfolioCalculations";
import { toLocalDateKey } from "../../../utils/dates";

export type CreateHoldingInput = Omit<Holding, "id" | "createdAt" | "updatedAt">;

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}

export function useHoldings() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHoldings([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "users", user.uid, "holdings"));
    const safetyTimer = setTimeout(() => setLoading(false), 8_000);

    const unsub = onSnapshot(
      q,
      (snap) => {
        clearTimeout(safetyTimer);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Holding));
        list.sort((a, b) => a.symbol.localeCompare(b.symbol));
        setHoldings(list);
        setLoading(false);
      },
      (err) => {
        clearTimeout(safetyTimer);
        console.error("useHoldings error:", err);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      unsub();
    };
  }, [user]);

  const addHolding = async (data: CreateHoldingInput): Promise<string | null> => {
    if (!user) return null;
    try {
      const ref = await addDoc(collection(db, "users", user.uid, "holdings"), {
        ...stripUndefined(data),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Holding added");
      return ref.id;
    } catch (err) {
      console.error(err);
      toast.error("Failed to add holding");
      return null;
    }
  };

  const updateHolding = async (id: string, patch: Partial<CreateHoldingInput>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "holdings", id), {
        ...stripUndefined(patch),
        updatedAt: serverTimestamp(),
      });
      toast.success("Holding updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update holding");
    }
  };

  const markTargetAlertTriggered = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "holdings", id), {
        targetAlertTriggeredAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to persist target-price alert state", err);
    }
  };

  const applyBuyToHolding = async (
    holdingId: string,
    quantity: number,
    price: number
  ) => {
    const holding = holdings.find((h) => h.id === holdingId);
    if (!holding || !user) return;
    const newQty = holding.quantity + quantity;
    const newAvg = computeWeightedAverage(
      holding.quantity,
      holding.averageBuyPrice,
      quantity,
      price
    );
    await updateHolding(holdingId, { quantity: newQty, averageBuyPrice: newAvg });
  };

  const applySellToHolding = async (holdingId: string, quantity: number) => {
    const holding = holdings.find((h) => h.id === holdingId);
    if (!holding || !user) return;
    const newQty = holding.quantity - quantity;
    if (newQty <= 0) {
      await deleteHolding(holdingId);
    } else {
      await updateHolding(holdingId, { quantity: newQty });
    }
  };

  const deleteHolding = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "holdings", id));
      toast.success("Holding removed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove holding");
    }
  };

  const findBySymbol = (symbol: string, exchange: string) =>
    holdings.find(
      (h) => h.symbol === symbol.toUpperCase() && h.exchange === exchange
    );

  const overwriteHoldings = async (newHoldings: CreateHoldingInput[]) => {
    if (!user) return false;
    try {
      const { writeBatch } = await import("firebase/firestore");
      const batch = writeBatch(db);

      holdings.forEach((h) => {
        const ref = doc(db, "users", user.uid, "holdings", h.id);
        batch.delete(ref);
      });

      newHoldings.forEach((h) => {
        const ref = doc(collection(db, "users", user.uid, "holdings"));
        batch.set(ref, {
          ...stripUndefined(h),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
      return true;
    } catch (err) {
      console.error("Failed to overwrite holdings", err);
      toast.error("Failed to import CSV");
      return false;
    }
  };

  return {
    holdings,
    loading,
    addHolding,
    updateHolding,
    markTargetAlertTriggered,
    deleteHolding,
    applyBuyToHolding,
    applySellToHolding,
    findBySymbol,
    overwriteHoldings,
  };
}

export function todayKey() {
  return toLocalDateKey(new Date());
}
