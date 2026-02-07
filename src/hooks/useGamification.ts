import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, collection, query, where, getDocs, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import type { UserStats } from '../types/stats';
import { LEVEL_THRESHOLDS } from '../types/stats';
import { toast } from 'react-toastify';

const DEFAULT_STATS: UserStats = {
    currentStreak: 0,
    longestStreak: 0,
    lastLoginDate: '',
    points: 0,
    level: 1,
    badges: [],
    shields: 0,
    fires: 0,
    focusStreak: 0,
    focusWins: 0,
    monthlyRecords: {}
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
                const data = docSnap.data() as UserStats;
                // Merge with default to handle new fields for existing users
                setStats({ ...DEFAULT_STATS, ...data });
            } else {
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

    // 2. Helper: Add XP (Manual or Auto)
    const addXP = useCallback(async (amount: number) => {
        if (!user) return;

        try {
            const statsRef = doc(db, 'users', user.uid, 'stats', 'summary');
            const docSnap = await getDoc(statsRef);

            let currentStats = DEFAULT_STATS;
            if (docSnap.exists()) {
                currentStats = { ...DEFAULT_STATS, ...docSnap.data() as UserStats };
            }

            let newPoints = currentStats.points + amount;
            let newLevel = currentStats.level;

            // Check Level Up
            for (const [lvl, threshold] of Object.entries(LEVEL_THRESHOLDS)) {
                if (newPoints >= threshold) {
                    newLevel = Math.max(newLevel, Number(lvl));
                }
            }

            if (newLevel > currentStats.level) {
                toast.success(`🎉 Level Up! You are now Level ${newLevel}!`);
            } else if (amount > 0) {
                // Feedback for XP gain (optional, maybe distinct sound or small toast)
                // toast.info(`+${amount} XP`); 
            }

            await setDoc(statsRef, {
                points: newPoints,
                level: newLevel
            }, { merge: true });

        } catch (error) {
            console.error("Failed to add XP:", error);
        }
    }, [user]);

    // 3. Daily Logic Check (Run once per session or on date change)
    useEffect(() => {
        if (!user || loading) return;

        const checkDailyProgress = async () => {
            const today = new Date().toISOString().split('T')[0];

            // Avoid redundant writes if already processed today
            if (stats.lastLoginDate === today) return;

            try {
                const statsRef = doc(db, 'users', user.uid, 'stats', 'summary');

                // Get fresh snapshot to be safe
                const docSnap = await getDoc(statsRef);
                const currentStats = docSnap.exists() ? { ...DEFAULT_STATS, ...docSnap.data() as UserStats } : DEFAULT_STATS;

                if (currentStats.lastLoginDate === today) return; // Double check

                const lastDate = currentStats.lastLoginDate;

                // --- YESTERDAY CHECK ---
                // We check what happened YESTERDAY to award Shields or Fires
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                const lastMonthStr = yesterdayStr.slice(0, 7); // YYYY-MM

                // Query yesterday's expenses
                const expensesRef = collection(db, 'users', user.uid, 'expenses');
                const q = query(expensesRef, where("date", "==", yesterdayStr));
                const snapshot = await getDocs(q);
                const spentMoneyYesterday = !snapshot.empty;

                let newShields = currentStats.shields;
                let newFires = currentStats.fires;
                let newFocusStreak = currentStats.focusStreak || 0;
                let newFocusWins = currentStats.focusWins || 0;
                let xpToAdd = 0;

                // --- FOCUS MODE CHECK (YESTERDAY) ---
                const focusRef = doc(db, 'users', user.uid, 'focus', 'active');
                const focusSnap = await getDoc(focusRef);

                if (focusSnap.exists()) {
                    const focusData = focusSnap.data();
                    if (focusData.status === 'active') {
                        // Check if Yesterday was within the focus period
                        const focusStart = new Date(focusData.startDate);
                        const focusEnd = new Date(focusData.endDate);
                        const yDate = new Date(yesterdayStr);

                        // Simple check: is yesterday >= start AND yesterday <= end? (Ignoring time for simplicity)
                        // We compare YYYY-MM-DD strings to be safe
                        if (yesterdayStr >= focusData.startDate.split('T')[0] && yesterdayStr <= focusData.endDate.split('T')[0]) {

                            // Calculate yesterday's spend for this category
                            const focusQ = query(
                                expensesRef,
                                where("date", "==", yesterdayStr),
                                where("category", "==", focusData.category)
                            );
                            const focusExpenses = await getDocs(focusQ);
                            let dailyFocusSpend = 0;
                            focusExpenses.forEach(d => dailyFocusSpend += Number(d.data().amount));

                            if (dailyFocusSpend <= focusData.dailyLimit) {
                                newFocusStreak += 1;
                                newFocusWins += 1;
                                xpToAdd += 50; // Bonus for keeping focus!
                                console.log("🎯 Focus Goal Met!", dailyFocusSpend, "/", focusData.dailyLimit);
                            } else {
                                newFocusStreak = 0;
                                console.log("❌ Focus Goal Failed", dailyFocusSpend);
                            }
                        }
                    }
                }

                if (lastDate === yesterdayStr) {
                    // Consecutive login, process streaks based on YESTERDAY's activity
                    if (spentMoneyYesterday) {
                        newFires += 1;
                        newShields = 0; // Reset shield
                        xpToAdd += 10; // Small XP for tracking
                        console.log("🔥 Fire Streak Increased!");
                    } else {
                        newShields += 1;
                        newFires = 0; // Reset fire
                        xpToAdd += 50; // Big XP for saving!
                        console.log("🛡️ Shield Streak Increased!");
                    }
                } else {
                    // Missed a login or first time. 
                    // If we missed days, technically streaks might break.
                    // For simplicity in this v1, if lastLogin wasn't yesterday, we might reset BOTH or handle leniently.
                    // Let's reset both to 0 if gap > 1 day.
                    // Actually, let's just process "Yesterday" if we can, but if it was 2 days ago, we reset.
                    const dayDifference = (new Date(today).getTime() - new Date(lastDate).getTime()) / (1000 * 3600 * 24);

                    if (dayDifference > 1) {
                        newShields = 0;
                        newFires = 0;
                        xpToAdd += 5; // Welcome back
                    } else {
                        // Logic for first run ever
                        xpToAdd += 5;
                    }
                }

                // --- MONTHLY RECORDS ---
                const monthlyRecords = { ...currentStats.monthlyRecords };
                if (!monthlyRecords[lastMonthStr]) {
                    monthlyRecords[lastMonthStr] = { maxShields: 0, maxFires: 0, totalShields: 0, totalFires: 0 };
                }

                const mStats = monthlyRecords[lastMonthStr];
                if (spentMoneyYesterday) mStats.totalFires++;
                else mStats.totalShields++;

                mStats.maxShields = Math.max(mStats.maxShields, newShields);
                mStats.maxFires = Math.max(mStats.maxFires, newFires);

                // Also update Total XP
                let newPoints = currentStats.points + xpToAdd;
                let newLevel = currentStats.level;
                for (const [lvl, threshold] of Object.entries(LEVEL_THRESHOLDS)) {
                    if (newPoints >= threshold) {
                        newLevel = Math.max(newLevel, Number(lvl));
                    }
                }

                // WRITE UPDATES
                await setDoc(statsRef, {
                    ...currentStats,
                    lastLoginDate: today,
                    shields: newShields,
                    fires: newFires,
                    points: newPoints,
                    level: newLevel,
                    focusStreak: newFocusStreak,
                    focusWins: newFocusWins,
                    monthlyRecords
                }, { merge: true });

                console.log("Daily gamification processed!");

            } catch (err) {
                console.error("Failed to run daily gamification check:", err);
            }
        };

        checkDailyProgress();
    }, [user, loading, stats.lastLoginDate]);

    return { stats, loading, addXP };
}
