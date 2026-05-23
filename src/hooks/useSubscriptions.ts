import { useState, useEffect, useCallback } from "react";
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    getDocs,
    where
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";
import type { Subscription } from "../types/subscription";
import { toast } from "react-toastify";
import { useGamification } from "./useGamification";
import { currentMonthKey, todayDateKey } from "../utils/dates";

export function useSubscriptions() {
    const { user } = useAuth();
    const { addXP } = useGamification();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);

    const getLocalMonth = () => currentMonthKey();

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
        const currentYear = new Date().getFullYear();
        const currentMonthInt = new Date().getMonth() + 1;
        const currentDay = getLocalDay();
        let isCompleted = false;

        try {
            // Tenure Logic: Check if EMI is already completed
            if (sub.type === "emi" && sub.endYear && sub.endMonth) {
                if (currentYear > sub.endYear || (currentYear === sub.endYear && currentMonthInt > sub.endMonth)) {
                    isCompleted = true;
                }
            }

            // 1. Save the Subscription first so generated expenses can link by id
            // Filter out undefined values (e.g. endMonth/endYear for non-EMIs)
            const cleanSub = Object.fromEntries(
                Object.entries(sub).filter(([_, v]) => v !== undefined)
            );

            const subRef = await addDoc(collection(db, "users", user.uid, "subscriptions"), {
                ...cleanSub,
                lastProcessed: "",
                isCompleted,
                isActive: isCompleted ? false : sub.isActive,
                createdAt: serverTimestamp(),
            });

            const dueNow = sub.isActive && !isCompleted && currentDay >= sub.dayOfMonth;
            if (dueNow) {
                const existingByIdQ = query(
                    collection(db, "users", user.uid, "expenses"),
                    where("month", "==", currentMonth),
                    where("subscriptionId", "==", subRef.id)
                );
                const existingByIdSnap = await getDocs(existingByIdQ);
                let hasExisting = !existingByIdSnap.empty;
                if (!hasExisting) {
                    const legacyQ = query(
                        collection(db, "users", user.uid, "expenses"),
                        where("month", "==", currentMonth),
                        where("note", "==", `${sub.name} (Auto-subscription)`),
                        where("amount", "==", sub.amount)
                    );
                    const legacySnap = await getDocs(legacyQ);
                    hasExisting = !legacySnap.empty;
                }
                if (!hasExisting) {
                    await addDoc(collection(db, "users", user.uid, "expenses"), {
                        amount: sub.amount,
                        category: sub.category,
                        note: `${sub.name} (Auto-subscription)`,
                        date: todayDateKey(),
                        month: currentMonth,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        createdAt: serverTimestamp(),
                        fromSubscription: true,
                        subscriptionId: subRef.id,
                        ...(sub.accountId ? { accountId: sub.accountId } : {}),
                    });
                    addXP(10);
                    toast.success("Subscription added & expense created!");
                } else {
                    toast.success("Subscription added (expense already exists for this month)");
                }
                await updateDoc(doc(db, "users", user.uid, "subscriptions", subRef.id), {
                    lastProcessed: currentMonth,
                });
            } else {
                toast.success("Subscription added");
            }

        } catch (error) {
            console.error("Error adding subscription:", error);
            toast.error("Failed to add subscription");
        }
    };

    const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
        if (!user) return;
        try {
            // Filter out undefined values to prevent Firebase crashes
            const cleanUpdates = Object.fromEntries(
                Object.entries(updates).filter(([_, v]) => v !== undefined)
            );
            await updateDoc(doc(db, "users", user.uid, "subscriptions", id), cleanUpdates);
            toast.success("Subscription updated");
        } catch (error) {
            console.error("Error updating subscription:", error);
            toast.error("Failed to update subscription");
        }
    };

    const deleteSubscription = async (id: string) => {
        if (!user) return;
        try {
            const linkedExpensesQ = query(
                collection(db, "users", user.uid, "expenses"),
                where("subscriptionId", "==", id)
            );
            const linkedExpensesSnap = await getDocs(linkedExpensesQ);
            await Promise.all(linkedExpensesSnap.docs.map((d) => deleteDoc(d.ref)));
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
            if (!sub.isActive || sub.isCompleted) continue;

            // Tenure Check: Has the EMI expired?
            if (sub.type === "emi" && sub.endYear && sub.endMonth) {
                const now = new Date();
                const currentY = now.getFullYear();
                const currentM = now.getMonth() + 1;
                
                if (currentY > sub.endYear || (currentY === sub.endYear && currentM > sub.endMonth)) {
                    await updateDoc(doc(db, "users", user.uid, "subscriptions", sub.id!), {
                        isCompleted: true,
                        isActive: false
                    });
                    console.log(`[Tenure] EMI ${sub.name} completed.`);
                    continue;
                }
            }

            if (sub.lastProcessed === currentMonth) continue; // Already handled (by addSub or prev run)

            // 2. Check due date
            if (currentDay >= sub.dayOfMonth) {
                try {
                    // Double-Check Idempotency (in case of race conditions during app load)
                    // We use a specific query to see if an expense exists for this month.
                    const expensesRef = collection(db, "users", user.uid, "expenses");
                    const byIdQ = query(
                        expensesRef,
                        where("month", "==", currentMonth),
                        where("subscriptionId", "==", sub.id)
                    );
                    const byIdSnap = await getDocs(byIdQ);
                    let hasExisting = !byIdSnap.empty;
                    if (!hasExisting) {
                        const legacyQ = query(
                            expensesRef,
                            where("month", "==", currentMonth),
                            where("note", "==", `${sub.name} (Auto-subscription)`),
                            where("amount", "==", sub.amount)
                        );
                        const legacySnap = await getDocs(legacyQ);
                        hasExisting = !legacySnap.empty;
                    }

                    if (hasExisting) {
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
                        date: todayDateKey(),
                        month: currentMonth,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        createdAt: serverTimestamp(),
                        fromSubscription: true,
                        subscriptionId: sub.id,
                        ...(sub.accountId ? { accountId: sub.accountId } : {})
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
