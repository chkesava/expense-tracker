import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, query, orderBy, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from './useAuth';

export interface WeightRecord {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  notes?: string;
  timestamp: number;
}

export function useWeightHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const historyRef = collection(db, `users/${user.uid}/weight_history`);
    const q = query(historyRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WeightRecord[];
      
      setHistory(records);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addWeightRecord = async (date: string, weightKg: number, notes?: string) => {
    if (!user) return;
    const recordRef = doc(db, `users/${user.uid}/weight_history`, date);
    await setDoc(recordRef, {
      date,
      weightKg,
      notes: notes || "",
      timestamp: Date.now()
    });
  };

  const deleteWeightRecord = async (date: string) => {
    if (!user) return;
    const recordRef = doc(db, `users/${user.uid}/weight_history`, date);
    await deleteDoc(recordRef);
  };

  return {
    history,
    loading,
    addWeightRecord,
    deleteWeightRecord
  };
}
