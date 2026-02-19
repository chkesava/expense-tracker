import { motion } from "framer-motion";
import AdminStatsCards from "../components/AdminStatsCards";
import AdminCharts from "../components/AdminCharts";
import UserLeaderboard from "../components/UserLeaderboard";
import { useAdminData } from "../hooks/useAdminData";

export default function AdminDashboard() {
    const { stats, users, loading } = useAdminData();

    return (
        <div className="min-h-screen pb-24 bg-slate-50/50 p-4 md:p-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto"
            >
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                    <p className="text-slate-500">Global overview & analytics</p>
                </header>

                <AdminStatsCards stats={stats} loading={loading} />

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <AdminCharts stats={stats} />
                    </div>
                    <div className="lg:col-span-1">
                        <UserLeaderboard users={users} />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
