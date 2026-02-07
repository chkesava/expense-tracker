import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import type { FocusSession } from '../types/focus';
import { toast } from 'react-toastify';

export function useFocusMode() {
    const { user } = useAuth();
    const [activeFocus, setActiveFocus] = useState<FocusSession | null>(null);
    const [loading, setLoading] = useState(true);

    // 1. Listen for Active Focus
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const focusRef = doc(db, 'users', user.uid, 'focus', 'active');

        const unsubscribe = onSnapshot(focusRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as FocusSession;
                // Check if expired
                const today = new Date();
                const end = new Date(data.endDate);

                if (today > end && data.status === 'active') {
                    // Logic to handle auto-completion or just marking as done
                    // For now, just load it, we can handle expiration in UI or separate check
                }

                if (data.status === 'active') {
                    setActiveFocus(data);
                } else {
                    setActiveFocus(null);
                }
            } else {
                setActiveFocus(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // 2. Start New Focus
    const startFocus = async (category: string, dailyLimit: number, durationDays: number) => {
        if (!user) return;

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + durationDays);

        const newFocus: FocusSession = {
            id: crypto.randomUUID(),
            category,
            dailyLimit,
            durationDays,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            status: 'active',
            daysSuccessful: 0,
            lastCheckDate: startDate.toISOString().split('T')[0],
            currentSpend: 0
        };

        try {
            await setDoc(doc(db, 'users', user.uid, 'focus', 'active'), newFocus);
            toast.success(`Focus Mode Activated: ${category}`);
        } catch (error) {
            console.error("Failed to start focus:", error);
            toast.error("Failed to activate Focus Mode");
        }
    };

    // 3. Give Up
    const cancelFocus = async () => {
        if (!user || !activeFocus) return;
        try {
            await setDoc(doc(db, 'users', user.uid, 'focus', 'active'), {
                ...activeFocus,
                status: 'abandoned'
            });
            setActiveFocus(null);
            toast.info("Focus Mode cancelled");
        } catch (error) {
            console.error("Failed to cancel focus:", error);
        }
    };

    // 4. Calculate Current Progress (Daily Spend)
    // This needs to be called by the UI to verify if budget is met today
    const checkDailySpend = useCallback(async () => {
        if (!user || !activeFocus) return 0;

        const todayStr = new Date().toISOString().split('T')[0];

        // Query expenses for TODAY and CATEGORY
        const expensesRef = collection(db, 'users', user.uid, 'expenses');
        const q = query(
            expensesRef,
            where("date", "==", todayStr),
            where("category", "==", activeFocus.category)
        );

        const snapshot = await getDocs(q);
        let total = 0;
        snapshot.docs.forEach(doc => {
            total += Number(doc.data().amount);
        });

        return total;
    }, [user, activeFocus]);

    return {
        activeFocus,
        loading,
        startFocus,
        cancelFocus,
        checkDailySpend
    };
}
