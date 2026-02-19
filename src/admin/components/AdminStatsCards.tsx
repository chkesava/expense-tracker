import { motion } from "framer-motion";

interface StatCardProps {
    label: string;
    value: string | number;
    icon: string;
    color: string;
    delay?: number;
}

const StatCard = ({ label, value, icon, color, delay = 0 }: StatCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
        className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
    >
        <div className="flex items-start justify-between">
            <div>
                <h3 className="text-slate-500 text-sm font-medium mb-1">{label}</h3>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-xl`}>
                {icon}
            </div>
        </div>
    </motion.div>
);

interface AdminStatsCardsProps {
    stats: {
        totalUsers: number;
        totalExpensesCount: number;
        totalSpend: number;
        avgSpendPerUser: number;
    } | null;
    loading: boolean;
}

export default function AdminStatsCards({ stats, loading }: AdminStatsCardsProps) {
    if (loading || !stats) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-28 bg-white/50 animate-pulse rounded-2xl" />
                ))}
            </div>
        );
    }

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
                label="Total Users"
                value={stats.totalUsers}
                icon="👥"
                color="bg-blue-100 text-blue-600"
                delay={0}
            />
            <StatCard
                label="Total Spend"
                value={formatCurrency(stats.totalSpend)}
                icon="💰"
                color="bg-emerald-100 text-emerald-600"
                delay={0.1}
            />
            <StatCard
                label="Avg Spend / User"
                value={formatCurrency(stats.avgSpendPerUser)}
                icon="📊"
                color="bg-purple-100 text-purple-600"
                delay={0.2}
            />
            <StatCard
                label="Total Expenses"
                value={stats.totalExpensesCount}
                icon="📝"
                color="bg-amber-100 text-amber-600"
                delay={0.3}
            />
        </div>
    );
}
