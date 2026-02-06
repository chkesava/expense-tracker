import { useState, useEffect, useCallback } from "react";
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
    getDocs,
    where
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";
import type { Subscription } from "../types/subscription";
import { toast } from "react-toastify";
import { useGamification } from "./useGamification";

export function useSubscriptions() {
    const { user } = useAuth();
    const { addXP } = useGamification();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);

    // Helper: Get local YYYY-MM
    const getLocalMonth = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    // Helper: Get local Day of Month (1-31)
    const getLocalDay = () => new Date().getDate();

    // Fetch Subscriptions
    useEffect(() => {
        if (!user) {
            setSubscriptions([]);
            setLoading(false);
            return;
        }

        const q = query(collection(db, "users", user.uid, "subscriptions"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const subs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Subscription[];
            setSubscriptions(subs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Transactional Add: Checks logic BEFORE saving to ensure atomic-like behavior
    const addSubscription = async (sub: Omit<Subscription, "id" | "lastProcessed" | "createdAt">) => {
        if (!user) return;

        const currentMonth = getLocalMonth();
        const currentDay = getLocalDay();
        let initialLastProcessed = "";

        try {
            // Logic: If the subscription is active AND due (today or past), 
            // we process it IMMEDIATELY and mark it as processed.
            // This prevents the background listener from "seeing" it as unprocessed later.
            if (sub.isActive && currentDay >= sub.dayOfMonth) {
                console.log(`[AddSub] Subscription ${sub.name} is due immediately. Creating expense...`);

                // 1. Create the Expense
                await addDoc(collection(db, "users", user.uid, "expenses"), {
                    amount: sub.amount,
                    category: sub.category,
                    note: `${sub.name} (Auto-subscription)`,
                    date: new Date().toISOString().slice(0, 10), // Today
                    month: currentMonth,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    createdAt: serverTimestamp(),
                    fromSubscription: true
                });

                // 2. Mark as processed so the listener skips it
                initialLastProcessed = currentMonth;
                toast.success("Subscription added & expense created!");
                addXP(10);
            } else {
                toast.success("Subscription added");
            }

            // 3. Save the Subscription
            await addDoc(collection(db, "users", user.uid, "subscriptions"), {
                ...sub,
                lastProcessed: initialLastProcessed,
                createdAt: serverTimestamp(),
            });

        } catch (error) {
            console.error("Error adding subscription:", error);
            toast.error("Failed to add subscription");
        }
    };

    const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
        if (!user) return;
        try {
            await updateDoc(doc(db, "users", user.uid, "subscriptions", id), updates);
            toast.success("Subscription updated");
        } catch (error) {
            console.error("Error updating subscription:", error);
            toast.error("Failed to update subscription");
        }
    };

    const deleteSubscription = async (id: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, "users", user.uid, "subscriptions", id));
            toast.success("Subscription removed");
        } catch (error) {
            console.error("Error deleting subscription:", error);
            toast.error("Failed to delete subscription");
        }
    };

    // Background Renewal Logic
    // This now ONLY handles renewals for *existing* subscriptions that move into a new month.
    // Newly added subscriptions are handled by addSubscription above.
    const processSubscriptions = useCallback(async () => {
        if (!user || loading || subscriptions.length === 0) return;

        const currentMonth = getLocalMonth();
        const currentDay = getLocalDay();
        let processedCount = 0;

        for (const sub of subscriptions) {
            // 1. Basic checks
            if (!sub.isActive) continue;
            if (sub.lastProcessed === currentMonth) continue; // Already handled (by addSub or prev run)

            // 2. Check due date
            if (currentDay >= sub.dayOfMonth) {
                try {
                    // Double-Check Idempotency (in case of race conditions during app load)
                    // We use a specific query to see if an expense exists for this month.
                    const expensesRef = collection(db, "users", user.uid, "expenses");
                    const q = query(
                        expensesRef,
                        where("month", "==", currentMonth),
                        where("note", "==", `${sub.name} (Auto-subscription)`),
                        where("amount", "==", sub.amount)
                    );
                    const snapshot = await getDocs(q);

                    if (!snapshot.empty) {
                        // Already exists, just update record and skip
                        if (sub.lastProcessed !== currentMonth) {
                            await updateDoc(doc(db, "users", user.uid, "subscriptions", sub.id!), {
                                lastProcessed: currentMonth
                            });
                        }
                        continue;
                    }

                    // 3. Generate Expense (Renewal)
                    await addDoc(collection(db, "users", user.uid, "expenses"), {
                        amount: sub.amount,
                        category: sub.category,
                        note: `${sub.name} (Auto-subscription)`,
                        date: new Date().toISOString().slice(0, 10),
                        month: currentMonth,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        createdAt: serverTimestamp(),
                        fromSubscription: true,
                        subscriptionId: sub.id
                    });

                    addXP(10);

                    // 4. Update Subscription
                    await updateDoc(doc(db, "users", user.uid, "subscriptions", sub.id!), {
                        lastProcessed: currentMonth
                    });

                    processedCount++;
                    console.log(`Renewed subscription: ${sub.name}`);
                } catch (err) {
                    console.error(`Failed to process subscription ${sub.name}`, err);
                }
            }
        }

        if (processedCount > 0) {
            toast.info(`Processed ${processedCount} subscription renewal${processedCount > 1 ? 's' : ''}`);
        }
    }, [user, subscriptions, loading]);

    return {
        subscriptions,
        loading,
        addSubscription,
        updateSubscription,
        deleteSubscription,
        processSubscriptions
    };
}
