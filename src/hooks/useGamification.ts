import { useState, useEffect } from 'react';
import { doc, setDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import type { UserStats } from '../types/stats';
import { LEVEL_THRESHOLDS } from '../types/stats';

const DEFAULT_STATS: UserStats = {
    currentStreak: 0,
    longestStreak: 0,
    lastLoginDate: '',
    points: 0,
    level: 1,
    badges: [],
};

export function useGamification() {
    const { user } = useAuth();
    const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
    const [loading, setLoading] = useState(true);

    // 1. Real-time Listener
    useEffect(() => {
        if (!user) {
            setStats(DEFAULT_STATS);
            setLoading(false);
            return;
        }

        const statsRef = doc(db, 'users', user.uid, 'stats', 'summary');

        const unsubscribe = onSnapshot(statsRef, (docSnap) => {
            if (docSnap.exists()) {
                setStats(docSnap.data() as UserStats);
            } else {
                // Initialize if missing
                setDoc(statsRef, DEFAULT_STATS, { merge: true });
                setStats(DEFAULT_STATS);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error listening to gamification stats:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // 2. Daily Logic Check (Run once per session or on date change)
    useEffect(() => {
        if (!user || loading) return;

        const checkDailyProgress = async () => {
            const today = new Date().toISOString().split('T')[0];

            // Avoid redundant writes if already processed today
            if (stats.lastLoginDate === today) return;

            try {
                const statsRef = doc(db, 'users', user.uid, 'stats', 'summary');

                // We use the LOCAL "stats" state here, which comes from the snapshot.
                // However, there's a race condition if snapshot hasn't loaded. 
                // But the 'loading' flag prevents this effect from running too early.

                const lastDate = stats.lastLoginDate;
                let newStreak = stats.currentStreak;
                let pointsToAdd = 0;

                // --- STREAK CALCULATION ---
                if (lastDate !== today) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    if (lastDate === yesterdayStr) {
                        newStreak += 1;
                        pointsToAdd += 10; // Daily login
                    } else {
                        newStreak = 1; // Reset
                        pointsToAdd += 5; // Welcome back
                    }

                    // --- NO SPEND CHECK ---
                    // Check if there were expenses yesterday
                    const expensesRef = collection(db, 'users', user.uid, 'expenses');
                    const q = query(expensesRef, where("date", "==", yesterdayStr));
                    const snapshot = await getDocs(q);

                    let noSpendBonus = false;
                    if (snapshot.empty) {
                        pointsToAdd += 50;
                        noSpendBonus = true;
                    }

                    // --- LEVEL CALCULATION ---
                    let newPoints = stats.points + pointsToAdd;
                    let newLevel = stats.level;

                    for (const [lvl, threshold] of Object.entries(LEVEL_THRESHOLDS)) {
                        if (newPoints >= threshold) {
                            newLevel = Math.max(newLevel, Number(lvl));
                        }
                    }

                    const newBadges = [...stats.badges];
                    if (noSpendBonus && !newBadges.includes('saver_pro')) {
                        newBadges.push('saver_pro');
                    }

                    // WRITE UPDATES
                    await setDoc(statsRef, {
                        ...stats,
                        currentStreak: newStreak,
                        longestStreak: Math.max(newStreak, stats.longestStreak),
                        lastLoginDate: today,
                        points: newPoints,
                        level: newLevel,
                        badges: newBadges
                    }, { merge: true });

                    console.log(" Daily gamification processed!");
                }
            } catch (err) {
                console.error("Failed to run daily gamification check:", err);
            }
        };

        checkDailyProgress();
    }, [user, loading, stats.lastLoginDate]); // Depend on lastLoginDate to trigger when local state reflects previous value

    return { stats, loading };
}
