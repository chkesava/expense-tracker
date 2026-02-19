import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import type { UserProfile } from "../../types/user";
import type { Expense } from "../../types/expense";

// Helper to fetch all users
export const moveAllUsers = async (): Promise<UserProfile[]> => {
    const querySnapshot = await getDocs(collection(db, "users"));
    return querySnapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
    })) as UserProfile[];
};

// Helper to fetch expenses for a specific user
export const moveUserExpenses = async (userId: string): Promise<Expense[]> => {
    const querySnapshot = await getDocs(
        collection(db, "users", userId, "expenses")
    );
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Expense[];
};

export interface GlobalStats {
    totalUsers: number;
    totalExpensesCount: number;
    totalSpend: number;
    avgSpendPerUser: number;
    monthlyTrend: { month: string; amount: number }[];
    categoryDistribution: { category: string; amount: number }[];
}

export const moveGlobalStats = async (): Promise<GlobalStats> => {
    const users = await moveAllUsers();
    let totalExpensesCount = 0;
    let totalSpend = 0;
    const monthlyTrendMap: Record<string, number> = {};
    const categoryDistributionMap: Record<string, number> = {};

    // Parallel fetch for all users' expenses
    const expensePromises = users.map((user) => moveUserExpenses(user.uid));
    const allUserExpenses = await Promise.all(expensePromises);

    allUserExpenses.forEach((expenses) => {
        expenses.forEach((expense) => {
            totalExpensesCount++;
            const amount = Number(expense.amount);
            totalSpend += amount;

            // Monthly Trend
            if (expense.month) {
                monthlyTrendMap[expense.month] = (monthlyTrendMap[expense.month] || 0) + amount;
            }

            // Category Distribution
            if (expense.category) {
                categoryDistributionMap[expense.category] =
                    (categoryDistributionMap[expense.category] || 0) + amount;
            }
        });
    });

    const avgSpendPerUser = users.length > 0 ? totalSpend / users.length : 0;

    const monthlyTrend = Object.entries(monthlyTrendMap)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month)); // Sort by YYYY-MM

    const categoryDistribution = Object.entries(categoryDistributionMap)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);

    return {
        totalUsers: users.length,
        totalExpensesCount,
        totalSpend,
        avgSpendPerUser,
        monthlyTrend,
        categoryDistribution,
    };
};
