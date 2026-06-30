import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import type { UserProfile } from "../../types/user";
import type { Expense } from "../../types/expense";
import { moveUserExpenses, updateUserRole } from "../utils/dataFetching";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { ArrowLeft, ChevronLeft, ChevronRight, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function AdminUserDetail() {
    const { userId } = useParams<{ userId: string }>();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const expensesPerPage = 10;

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

    const handleRoleChange = async () => {
        if (!user) return;
        const newRole = user.role === 'SUPER_ADMIN' ? 'USER' : 'SUPER_ADMIN';
        if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
        
        setIsUpdatingRole(true);
        try {
            await updateUserRole(user.uid, newRole);
            setUser({ ...user, role: newRole });
            toast.success(`User role updated to ${newRole}`);
        } catch (error) {
            console.error("Error updating role", error);
            toast.error("Failed to update user role.");
        } finally {
            setIsUpdatingRole(false);
        }
    };

    const sortedExpenses = useMemo(() => {
        return [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses]);

    const indexOfLastExpense = currentPage * expensesPerPage;
    const indexOfFirstExpense = indexOfLastExpense - expensesPerPage;
    const currentExpenses = sortedExpenses.slice(indexOfFirstExpense, indexOfLastExpense);
    const totalPages = Math.ceil(sortedExpenses.length / expensesPerPage);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-t-blue-600 mb-4"></div>
                <p className="text-slate-500 font-medium">Loading user details...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <h2 className="text-xl font-bold text-slate-800">User not found</h2>
                <Link to="/admin/users" className="flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Users
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
            borderColor: "rgb(37, 99, 235)",
            backgroundColor: "rgba(37, 99, 235, 0.1)",
            tension: 0.4,
            fill: true,
        }]
    };

    const categoryData = {
        labels: Object.keys(categoryMap),
        datasets: [{
            data: Object.values(categoryMap),
            backgroundColor: [
                "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#0ea5e9"
            ],
            borderWidth: 0,
        }]
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
            >
                <Link to="/admin/users" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 mb-6 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Users
                </Link>

                <header className="mb-8 flex flex-col md:flex-row md:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-md flex-shrink-0">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-4xl font-bold text-blue-600">
                                {(user.displayName || user.email || "?")[0].toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{user.displayName || "User"}</h1>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                user.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                                {user.role}
                            </span>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-slate-500">{user.email}</p>
                            <button
                                onClick={handleRoleChange}
                                disabled={isUpdatingRole}
                                className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    user.role === 'SUPER_ADMIN' 
                                        ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                                        : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200'
                                } disabled:opacity-50`}
                            >
                                {isUpdatingRole ? "Updating..." : user.role === 'SUPER_ADMIN' ? <><ShieldAlert className="w-4 h-4 mr-1.5" /> Demote to User</> : <><ShieldCheck className="w-4 h-4 mr-1.5" /> Promote to Admin</>}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Total Spend</p>
                                <p className="text-xl font-bold text-slate-900">
                                    {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalSpend)}
                                </p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Total Expenses</p>
                                <p className="text-xl font-bold text-slate-900">{expenses.length}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="grid lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg text-slate-900 mb-4">Spending Trend</h3>
                        <div className="h-64">
                            <Line data={trendData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg text-slate-900 mb-4">Category Breakdown</h3>
                        <div className="h-64 flex justify-center">
                            <Pie data={categoryData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-slate-900">Expense History</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4">Note</th>
                                    <th className="p-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {currentExpenses.map(expense => (
                                    <tr key={expense.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="p-4 text-slate-600">{expense.date}</td>
                                        <td className="p-4 text-slate-900 font-medium">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-700">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500 max-w-xs truncate" title={expense.note}>{expense.note || '-'}</td>
                                        <td className="p-4 text-right font-bold text-slate-900">
                                            {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(expense.amount))}
                                        </td>
                                    </tr>
                                ))}
                                {currentExpenses.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-500">
                                            No expenses found for this user.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {sortedExpenses.length > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
                            <div className="text-sm text-slate-500">
                                Showing <span className="font-medium text-slate-900">{indexOfFirstExpense + 1}</span> to <span className="font-medium text-slate-900">{Math.min(indexOfLastExpense, sortedExpenses.length)}</span> of <span className="font-medium text-slate-900">{sortedExpenses.length}</span> results
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <div className="text-sm font-medium text-slate-700 px-2">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </motion.div>
        </>
    );
}
