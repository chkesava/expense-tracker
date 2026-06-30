import { motion } from "framer-motion";
import AdminStatsCards from "../components/AdminStatsCards";
import AdminCharts from "../components/AdminCharts";
import UserLeaderboard from "../components/UserLeaderboard";
import { useAdminData } from "../hooks/useAdminData";

export default function AdminDashboard() {
    const { stats, users, loading } = useAdminData();

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto"
            >
                <header className="mb-8">
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Global overview and analytics</p>
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
        </>
    );
}
