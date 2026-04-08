import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp,
  orderBy,
  getDocs,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";
import type { Trip, TripCategoryBudget } from "../types/trip";

export function useTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "trips"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const tripsData: Trip[] = [];
      for (const d of snapshot.docs) {
        const data = d.data();
        // Fetch category budgets subcollection
        const catBudgetsQ = query(collection(db, `trips/${d.id}/categoryBudgets`));
        const catBudgetsSnap = await getDocs(catBudgetsQ);
        const categoryBudgets = catBudgetsSnap.docs.map(cbDoc => cbDoc.data() as TripCategoryBudget);
        
        tripsData.push({ 
          id: d.id, 
          ...data, 
          categoryBudgets,
          startDate: data.startDate?.toDate?.()?.toISOString() || data.startDate,
          endDate: data.endDate?.toDate?.()?.toISOString() || data.endDate,
        } as Trip);
      }
      setTrips(tripsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching trips:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addTrip = async (tripData: Omit<Trip, "id" | "userId" | "createdAt" | "spentAmount">, categoryBudgets: TripCategoryBudget[]) => {
    if (!user) return;

    const tripRef = await addDoc(collection(db, "trips"), {
      ...tripData,
      userId: user.uid,
      spentAmount: 0,
      status: "active",
      createdAt: serverTimestamp(),
    });

    // Add category budgets
    const batch = writeBatch(db);
    categoryBudgets.forEach((cb) => {
      const cbRef = doc(collection(db, `trips/${tripRef.id}/categoryBudgets`));
      batch.set(cbRef, cb);
    });
    await batch.commit();

    return tripRef.id;
  };

  const updateTrip = async (tripId: string, data: Partial<Trip>) => {
    const tripRef = doc(db, "trips", tripId);
    await updateDoc(tripRef, { ...data });
  };

  const deleteTrip = async (tripId: string) => {
    if (!user) return;
    const tripRef = doc(db, "trips", tripId);
    
    // 1. Clear tripId in expenses
    const expensesQ = query(collection(db, "users", user.uid, "expenses"), where("tripId", "==", tripId));
    const expensesSnap = await getDocs(expensesQ);
    const batch = writeBatch(db);
    expensesSnap.docs.forEach((d) => {
      batch.update(d.ref, { tripId: null });
    });
    
    // 2. Delete the trip
    batch.delete(tripRef);
    await batch.commit();
  };

  const calculateSpentAmount = async (tripId: string) => {
    if (!user) return 0;
    const expensesQ = query(collection(db, "users", user.uid, "expenses"), where("tripId", "==", tripId));
    const expensesSnap = await getDocs(expensesQ);
    let total = 0;
    expensesSnap.docs.forEach((d) => {
      total += d.data().amount || 0;
    });
    return total;
  };

  const syncTripSpentAmount = async (tripId: string) => {
    const total = await calculateSpentAmount(tripId);
    await updateTrip(tripId, { spentAmount: total });
  };

  return {
    trips,
    loading,
    addTrip,
    updateTrip,
    deleteTrip,
    syncTripSpentAmount,
  };
}
