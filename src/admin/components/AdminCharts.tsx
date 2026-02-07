import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from "chart.js";
import { Line, Pie } from "react-chartjs-2";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

interface AdminChartsProps {
    stats: {
        monthlyTrend: { month: string; amount: number }[];
        categoryDistribution: { category: string; amount: number }[];
    } | null;
}

export default function AdminCharts({ stats }: AdminChartsProps) {
    if (!stats) return null;

    const trendData = {
        labels: stats.monthlyTrend.map((d) => d.month),
        datasets: [
            {
                label: "Total Spend (Global)",
                data: stats.monthlyTrend.map((d) => d.amount),
                borderColor: "rgb(99, 102, 241)",
                backgroundColor: "rgba(99, 102, 241, 0.5)",
                tension: 0.4,
            },
        ],
    };

    const categoryData = {
        labels: stats.categoryDistribution.slice(0, 5).map((d) => d.category),
        datasets: [
            {
                data: stats.categoryDistribution.slice(0, 5).map((d) => d.amount),
                backgroundColor: [
                    "rgba(255, 99, 132, 0.8)",
                    "rgba(54, 162, 235, 0.8)",
                    "rgba(255, 206, 86, 0.8)",
                    "rgba(75, 192, 192, 0.8)",
                    "rgba(153, 102, 255, 0.8)",
                ],
                borderWidth: 1,
            },
        ],
    };

    return (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Monthly Spend Trend</h3>
                <div className="h-64">
                    <Line
                        data={trendData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: "top" as const },
                            },
                        }}
                    />
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Top 5 Categories</h3>
                <div className="h-64 relative flex items-center justify-center">
                    <Pie
                        data={categoryData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: "right" as const },
                            },
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
