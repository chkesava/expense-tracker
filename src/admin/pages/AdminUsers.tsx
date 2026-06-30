import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, MoreHorizontal } from "lucide-react";
import { useAdminData } from "../hooks/useAdminData";

export default function AdminUsers() {
    const { users, loading } = useAdminData();
    const [search, setSearch] = useState("");
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 10;

    // Sorting state
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const processedUsers = useMemo(() => {
        // Filter
        let result = users.filter((user) =>
            (user.displayName || user.username || user.email || "").toLowerCase().includes(search.toLowerCase())
        );

        // Sort
        if (sortConfig !== null) {
            result.sort((a: any, b: any) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return result;
    }, [users, search, sortConfig]);

    // Pagination calculations
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = processedUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(processedUsers.length / usersPerPage);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
            >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Users</h1>
                        <p className="text-slate-500 mt-1">Manage and view all registered users</p>
                    </div>
                    <div className="relative w-full sm:w-72">
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1); // Reset to first page on search
                            }}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-blue-600 mb-4"></div>
                        <p className="text-slate-500 font-medium">Loading users...</p>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                                        <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('displayName')}>
                                            <div className="flex items-center gap-2">
                                                User <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                            </div>
                                        </th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('expenseCount')}>
                                            <div className="flex items-center justify-end gap-2">
                                                Expenses <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                            </div>
                                        </th>
                                        <th className="p-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('totalSpend')}>
                                            <div className="flex items-center justify-end gap-2">
                                                Total Spend <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                            </div>
                                        </th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {currentUsers.map((user) => (
                                        <tr key={user.uid} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0 border border-blue-200">
                                                        {user.photoURL ? (
                                                            <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="font-semibold text-sm">
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
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === "SUPER_ADMIN"
                                                        ? "bg-purple-100 text-purple-700 border border-purple-200"
                                                        : "bg-slate-100 text-slate-700 border border-slate-200"
                                                        }`}
                                                >
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-medium text-slate-700">{user.expenseCount}</td>
                                            <td className="p-4 text-right font-medium text-slate-900">{formatCurrency(user.totalSpend)}</td>
                                            <td className="p-4 text-right">
                                                <Link
                                                    to={`/admin/user/${user.uid}`}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                >
                                                    <MoreHorizontal className="h-5 w-5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {currentUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center">
                                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
                                                    <Search className="h-6 w-6 text-slate-400" />
                                                </div>
                                                <h3 className="text-sm font-medium text-slate-900 mb-1">No users found</h3>
                                                <p className="text-sm text-slate-500">
                                                    No users match your search criteria "{search}"
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {processedUsers.length > 0 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
                                <div className="text-sm text-slate-500">
                                    Showing <span className="font-medium text-slate-900">{indexOfFirstUser + 1}</span> to <span className="font-medium text-slate-900">{Math.min(indexOfLastUser, processedUsers.length)}</span> of <span className="font-medium text-slate-900">{processedUsers.length}</span> results
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
                )}
            </motion.div>
        </>
    );
}
