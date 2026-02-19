import { useState, useEffect } from "react";
import { moveGlobalStats, type GlobalStats, moveAllUsers, moveUserExpenses } from "../utils/dataFetching";
import type { UserProfile } from "../../types/user";

export interface UserWithStats extends UserProfile {
    totalSpend: number;
    expenseCount: number;
    lastActivity?: string;
}

export function useAdminData() {
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [users, setUsers] = useState<UserWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const allUsers = await moveAllUsers();

                // Fetch expenses for all users to calculate stats
                const usersWithStats = await Promise.all(
                    allUsers.map(async (user) => {
                        const expenses = await moveUserExpenses(user.uid);
                        const totalSpend = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
                        return {
                            ...user,
                            totalSpend,
                            expenseCount: expenses.length,
                            // Ideally we'd find the latest expense date here
                        };
                    })
                );

                // Recalculate global stats from the detailed user stats to avoid double fetching if possible, 
                // but for now keeping moveGlobalStats separate is fine, or we can derive it.
                // Actually moveGlobalStats does exactly the same fetch. Let's optimize later if needed.
                const globalStats = await moveGlobalStats();

                setStats(globalStats);
                setUsers(usersWithStats.sort((a, b) => b.totalSpend - a.totalSpend)); // Default sort by spend
            } catch (err: any) {
                console.error("Failed to load admin data", err);
                setError(err.message || "Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    return { stats, users, loading, error };
}
