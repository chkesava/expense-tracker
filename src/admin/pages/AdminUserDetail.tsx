import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import type { UserProfile } from "../../types/user";
import type { Expense } from "../../types/expense";
import { moveUserExpenses } from "../utils/dataFetching";
import { Line, Pie } from "react-chartjs-2";

export default function AdminUserDetail() {
    const { userId } = useParams<{ userId: string }>();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return;
            try {
                const userSnap = await getDoc(doc(db, "users", userId));
                if (userSnap.exists()) {
                    setUser({ uid: userSnap.id, ...userSnap.data() } as UserProfile);
                }
                const userExpenses = await moveUserExpenses(userId);
                setExpenses(userExpenses);
            } catch (error) {
                console.error("Error fetching user details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center flex-col gap-4">
                <h2 className="text-xl font-bold text-slate-800">User not found</h2>
                <Link to="/admin/users" className="text-blue-600 hover:underline">
                    &larr; Back to Users
                </Link>
            </div>
        );
    }

    const totalSpend = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Chart Data Preparation
    const monthlyTrendMap: Record<string, number> = {};
    const categoryMap: Record<string, number> = {};

    expenses.forEach(e => {
        if (e.month) monthlyTrendMap[e.month] = (monthlyTrendMap[e.month] || 0) + Number(e.amount);
        if (e.category) categoryMap[e.category] = (categoryMap[e.category] || 0) + Number(e.amount);
    });

    const trendData = {
        labels: Object.keys(monthlyTrendMap).sort(),
        datasets: [{
            label: "Monthly Spend",
            data: Object.keys(monthlyTrendMap).sort().map(k => monthlyTrendMap[k]),
            borderColor: "rgb(99, 102, 241)",
            tension: 0.4,
        }]
    };

    const categoryData = {
        labels: Object.keys(categoryMap),
        datasets: [{
            data: Object.values(categoryMap),
            backgroundColor: [
                "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"
            ]
        }]
    };

    return (
        <div className="min-h-screen pb-24 bg-slate-50/50 p-4 md:p-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto"
            >
                <Link to="/admin/users" className="inline-flex items-center text-slate-500 hover:text-blue-600 mb-6 transition-colors">
                    &larr; Back to Users
                </Link>

                <header className="mb-8 flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-3xl font-bold text-slate-500">
                                {(user.displayName || user.email || "?")[0].toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{user.displayName}</h1>
                        <p className="text-slate-500">{user.email} • <span className="uppercase text-xs font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-600">{user.role}</span></p>
                        <p className="text-lg font-bold text-slate-900 mt-1">
                            Total Spend: {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalSpend)}
                        </p>
                    </div>
                </header>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="font-bold mb-4">Unusual Spending Trend</h3>
                        <div className="h-64">
                            <Line data={trendData} options={{ responsive: true, maintainAspectRatio: false }} />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="font-bold mb-4">Category Breakdown</h3>
                        <div className="h-64 flex justify-center">
                            <Pie data={categoryData} options={{ responsive: true, maintainAspectRatio: false }} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-bold text-lg">Expense History</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4">Note</th>
                                    <th className="p-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(expense => (
                                    <tr key={expense.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-slate-600 text-sm">{expense.date}</td>
                                        <td className="p-4 text-slate-900 font-medium text-sm">{expense.category}</td>
                                        <td className="p-4 text-slate-500 text-sm">{expense.note}</td>
                                        <td className="p-4 text-right font-bold text-slate-900">
                                            {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(expense.amount))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </motion.div>
        </div>
    );
}
