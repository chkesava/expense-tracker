import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";
import type { PaymentRequest, PaymentRequestInput } from "../types/paymentRequest";
import type { QrStyleId } from "../utils/qrStyles";
import { generatePaymentSlug } from "../utils/paymentSlug";
import { toast } from "react-toastify";

export async function fetchPaymentRequestBySlug(
  slug: string
): Promise<PaymentRequest | null> {
  const snap = await getDoc(doc(db, "paymentRequests", slug));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    slug: data.slug ?? snap.id,
    ...data,
  } as PaymentRequest;
}

export function usePaymentRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "paymentRequests"),
      where("createdBy", "==", user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const row = d.data();
          return {
            id: d.id,
            slug: row.slug ?? d.id,
            ...row,
          } as PaymentRequest;
        });
        data.sort((a, b) => b.createdAt - a.createdAt);
        setRequests(data.filter((r) => r.status !== "cancelled"));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        toast.error("Failed to load payment requests");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  const createPaymentRequest = async (input: PaymentRequestInput) => {
    if (!user) throw new Error("Not authenticated");

    const payload = {
      ...input,
      createdBy: user.uid,
      createdAt: Date.now(),
      status: "active" as const,
    };

    const clean = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined)
    );

    const slug = generatePaymentSlug();
    await setDoc(doc(db, "paymentRequests", slug), { ...clean, slug });
    toast.success("Payment page saved");
    return slug;
  };

  const updateQrStyle = async (slug: string, qrStyleId: QrStyleId) => {
    await updateDoc(doc(db, "paymentRequests", slug), { qrStyleId });
  };

  const cancelPaymentRequest = async (slug: string) => {
    await updateDoc(doc(db, "paymentRequests", slug), {
      status: "cancelled",
    });
    toast.success("Payment request removed");
  };

  const deletePaymentRequest = async (slug: string) => {
    await deleteDoc(doc(db, "paymentRequests", slug));
    toast.success("Payment request deleted");
  };

  return {
    requests,
    loading,
    createPaymentRequest,
    updateQrStyle,
    cancelPaymentRequest,
    deletePaymentRequest,
  };
}
