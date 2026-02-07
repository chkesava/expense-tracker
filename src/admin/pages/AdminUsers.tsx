import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAdminData } from "../hooks/useAdminData";

export default function AdminUsers() {
    const { users, loading } = useAdminData();
    const [search, setSearch] = useState("");

    const filteredUsers = users.filter((user) =>
        (user.displayName || user.username || user.email || "").toLowerCase().includes(search.toLowerCase())
    );

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);

    return (
        <div className="min-h-screen pb-24 bg-slate-50/50 p-4 md:p-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto"
            >
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Users</h1>
                        <p className="text-slate-500">Manage and view all registered users</p>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                        />
                        <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
                    </div>
                </header>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-slate-500">Loading users...</p>
                    </div>
                ) : (
                    <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                                        <th className="p-4 font-semibold">User</th>
                                        <th className="p-4 font-semibold">Role</th>
                                        <th className="p-4 font-semibold text-right">Expenses</th>
                                        <th className="p-4 font-semibold text-right">Total Spend</th>
                                        <th className="p-4 font-semibold text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.uid} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                                                        {user.photoURL ? (
                                                            <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-slate-500 font-bold">
                                                                {(user.username || user.displayName || user.email || "U")[0].toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900">
                                                            {user.username || user.displayName || user.email?.split('@')[0] || "User"}
                                                        </div>
                                                        <div className="text-xs text-slate-500">{user.email || user.uid}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === "SUPER_ADMIN"
                                                        ? "bg-purple-100 text-purple-700"
                                                        : "bg-slate-100 text-slate-600"
                                                        }`}
                                                >
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-medium text-slate-700">{user.expenseCount}</td>
                                            <td className="p-4 text-right font-bold text-slate-900">{formatCurrency(user.totalSpend)}</td>
                                            <td className="p-4 text-right">
                                                <Link
                                                    to={`/admin/user/${user.uid}`}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                >
                                                    View Details
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-500">
                                                No users found matching "{search}"
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
