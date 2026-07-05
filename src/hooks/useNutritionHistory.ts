import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { useAuth } from './useAuth';
import type { DailyLogSummary } from '../types/nutrition';

export function useNutritionHistory(days: number = 7) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<DailyLogSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const logsRef = collection(db, `users/${user.uid}/daily_logs`);
        
        // Fetch the most recent N logs
        const q = query(
          logsRef,
          orderBy('date', 'desc'),
          limit(days)
        );

        const snapshot = await getDocs(q);
        const fetchedLogs = snapshot.docs.map(doc => ({
          date: doc.id,
          ...doc.data()
        })) as DailyLogSummary[];

        // Recharts prefers chronological order (oldest to newest)
        setLogs(fetchedLogs.reverse());
      } catch (error) {
        console.error("Failed to fetch nutrition history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user, days]);

  return { logs, loading };
}
