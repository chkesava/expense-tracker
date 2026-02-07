import { Link } from "react-router-dom";
import type { UserWithStats } from "../hooks/useAdminData";

interface UserLeaderboardProps {
    users: UserWithStats[];
}

export default function UserLeaderboard({ users }: UserLeaderboardProps) {
    return (
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">All Users</h3>
                <Link to="/admin/users" className="text-blue-600 text-sm font-medium hover:underline">
                    View All
                </Link>
            </div>
            <div className="divide-y divide-slate-100">
                {users.slice(0, 5).map((user) => (
                    <Link
                        key={user.uid}
                        to={`/admin/user/${user.uid}`}
                        className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-slate-500 font-bold">
                                        {(user.displayName || user.email || "?")[0].toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                                    {user.displayName || "Unknown User"}
                                </p>
                                <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">
                                {new Intl.NumberFormat("en-IN", {
                                    style: "currency",
                                    currency: "INR",
                                    maximumFractionDigits: 0,
                                }).format(user.totalSpend)}
                            </p>
                            <span className="text-xs text-slate-400">View Details →</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
