import { useState, useEffect, useCallback } from "react";
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    getDocs
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";
import type { Subscription } from "../types/subscription";
import { toast } from "react-toastify";

export function useSubscriptions() {
    const { user } = useAuth();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);

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

    // CRUD Operations
    const addSubscription = async (sub: Omit<Subscription, "id" | "lastProcessed" | "createdAt">) => {
        if (!user) return;
        try {
            await addDoc(collection(db, "users", user.uid, "subscriptions"), {
                ...sub,
                lastProcessed: "", // Not processed yet
                createdAt: serverTimestamp(),
            });
            toast.success("Subscription added");
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

    // Logic: Check for due subscriptions and generate expenses
    const processSubscriptions = useCallback(async () => {
        if (!user || loading || subscriptions.length === 0) return;

        const today = new Date();
        const currentMonth = today.toISOString().slice(0, 7); // "YYYY-MM"
        const currentDay = today.getDate(); // 1-31

        let processedCount = 0;

        for (const sub of subscriptions) {
            // 1. Check if active
            if (!sub.isActive) continue;

            // 2. Check if already processed for this month
            if (sub.lastProcessed === currentMonth) continue;

            // 3. Check if due date has passed OR is today
            // NOTE: We want to generate it as soon as the day hits.
            // If dayOfMonth is 31 and current month has 30 days, we might want to handle that.
            // For simplicity: if today >= sub.dayOfMonth, generate it.
            if (currentDay >= sub.dayOfMonth) {

                try {
                    // Double Check: Ensure no expense exists for this month/category/amount/name to avoid duplicates 
                    // if lastProcessed wasn't updated for some reason (rare but safer).
                    // Actually, relies on lastProcessed is safer for "one-time" logic. 

                    // GENERATE EXPENSE
                    await addDoc(collection(db, "users", user.uid, "expenses"), {
                        amount: sub.amount,
                        category: sub.category,
                        note: `${sub.name} (Auto-subscription)`,
                        date: new Date().toISOString().slice(0, 10), // Use today's date for the created expense
                        month: currentMonth,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        createdAt: serverTimestamp(),
                    });

                    // UPDATE Subscription
                    await updateDoc(doc(db, "users", user.uid, "subscriptions", sub.id!), {
                        lastProcessed: currentMonth
                    });

                    processedCount++;
                    console.log(`Auto-generated expense for ${sub.name}`);
                } catch (err) {
                    console.error(`Failed to process subscription ${sub.name}`, err);
                }
            }
        }

        if (processedCount > 0) {
            toast.info(`⚡ processed ${processedCount} recurring expense${processedCount > 1 ? 's' : ''}!`);
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
