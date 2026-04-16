import { useExpenses } from "../hooks/useExpenses";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { 
  Filter, 
  Search, 
  ChevronRight, 
  TrendingUp, 
  Wallet,
  ArrowUpDown,
  Download,
  Activity,
  Zap,
  Clock,
  AlertCircle,
  BarChart2
} from "lucide-react";
import { CATEGORIES } from "../types/expense";
import { Skeleton } from "../components/common/Skeleton";
import useSettings from "../hooks/useSettings";
import { exportExpensesToCSV } from "../utils/exportCsv";
import { 
    getDailySpendingSeries, 
    getWeekendVsWeekdaySplit, 
    getTopVendors, 
    getAnomalies,
    getDayOfWeekDistribution
} from "../utils/rangeAnalytics";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart as RePieChart,
  Pie
} from "recharts";
import { COLORS } from "../utils/chartColors";
import PageHeader from "../components/layout/PageHeader";

export default function AnalysisLab() {
  const { expenses, loading } = useExpenses();
  const { accounts } = useAccounts();
  const { categories: userCategories } = useCategories();
  const { accountTypes } = useAccountTypes();

  // Range States
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Filter states
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedAccountTypeId, setSelectedAccountTypeId] = useState<string>("");
  const [showFilters, setShowFilters] = useState(true);

  // Sorting
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredExpenses = useMemo(() => {
    if (loading) return [];

    let results = expenses.filter(e => {
        if (e.date < startDate || e.date > endDate) return false;
        if (selectedCategory && e.category !== selectedCategory) return false;
        if (selectedAccountId && e.accountId !== selectedAccountId) return false;
        if (selectedAccountTypeId) {
            const account = accounts.find(a => a.id === e.accountId);
            if (!account || account.typeId !== selectedAccountTypeId) return false;
        }
        if (query) {
            const note = (e.note ?? "").toLowerCase();
            const category = (e.category ?? "").toLowerCase();
            const amount = String(e.amount);
            const matches = note.includes(query.toLowerCase()) || 
                          category.includes(query.toLowerCase()) || 
                          amount.includes(query);
            if (!matches) return false;
        }
        return true;
    });

    results.sort((a, b) => {
        if (sortField === "date") {
            const valA = a.date + (a.time || "");
            const valB = b.date + (b.time || "");
            return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
            return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount;
        }
    });

    return results;
  }, [expenses, loading, startDate, endDate, selectedCategory, selectedAccountId, selectedAccountTypeId, query, sortField, sortOrder, accounts]);

  const analytics = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const count = filteredExpenses.length;
    
    // Time metrics
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayDiff = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);
    
    const trendData = getDailySpendingSeries(filteredExpenses, startDate, endDate);
    const behavioral = getWeekendVsWeekdaySplit(filteredExpenses);
    const vendors = getTopVendors(filteredExpenses);
    const anomalies = getAnomalies(filteredExpenses);
    const dayDist = getDayOfWeekDistribution(filteredExpenses);
    
    // Category Pie Data
    const catMap: Record<string, number> = {};
    filteredExpenses.forEach(e => {
        catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    const pieData = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value }));

    return { 
        total, 
        count, 
        avgDaily: total / dayDiff,
        avgTrans: count > 0 ? total / count : 0,
        trendData, 
        behavioral, 
        vendors, 
        anomalies, 
        dayDist,
        pieData
    };
  }, [filteredExpenses, startDate, endDate]);

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedAccountId("");
    setSelectedAccountTypeId("");
    setQuery("");
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-7xl space-y-8 px-4 pb-32 pt-24"
    >
      <PageHeader 
        title="Analysis Lab" 
        subtitle="Universal financial searching and anomaly detection."
        icon={<Search className="text-blue-600" size={24} />}
        rightElement={
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition-all",
                showFilters 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
                  : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
              )}
            >
              <Filter size={16} />
              <span>Filters</span>
            </button>
            <button
              onClick={() => exportExpensesToCSV(filteredExpenses, "lab-export.csv")}
              className="hidden sm:flex items-center gap-2 rounded-2xl px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white text-sm font-bold shadow-lg"
            >
              <Download size={16} />
              <span>Export</span>
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left Sidebar: Controls */}
        <AnimatePresence>
          {showFilters && (
            <motion.aside 
              initial={{ width: 0, opacity: 0, x: -20 }}
              animate={{ width: 320, opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: -20 }}
              className="w-full space-y-6 lg:w-[320px] lg:shrink-0 overflow-hidden"
            >
              <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Analysis Core
                </h2>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500">From Date</label>
                    <input 
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-950/70"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500">To Date</label>
                    <input 
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-950/70"
                    />
                  </div>

                  <div className="h-px bg-slate-100 dark:bg-slate-800" />

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search keywords..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-950/70"
                    />
                  </div>

                  <div className="space-y-2">
                    <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-950">
                        <option value="">All Categories</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-950">
                        <option value="">All Accounts</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>

                  <button onClick={clearFilters} className="w-full text-center text-[10px] font-black uppercase text-slate-400 hover:text-blue-500">
                    Clear Selection
                  </button>
                </div>
              </section>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content: Laboratory Bento Grid */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Top Layer: Macro Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard 
                label="Aggregate Spend" 
                value={`₹${analytics.total.toLocaleString()}`} 
                icon={<TrendingUp className="h-4 w-4" />}
                subValue={`${analytics.count} entries found`}
                gradient="from-blue-500/20 to-indigo-500/5"
                loading={loading}
            />
            <StatCard 
                label="Daily Velocity" 
                value={`₹${Math.round(analytics.avgDaily).toLocaleString()}`} 
                icon={<Activity className="h-4 w-4" />}
                subValue="avg. burn per day"
                gradient="from-emerald-500/20 to-teal-500/5"
                loading={loading}
            />
            <StatCard 
                label="Transaction Avg" 
                value={`₹${Math.round(analytics.avgTrans).toLocaleString()}`} 
                icon={<Zap className="h-4 w-4" />}
                subValue="per expense impact"
                gradient="from-orange-500/20 to-amber-500/5"
                loading={loading}
            />
             <StatCard 
                label="Duration" 
                value={`${analytics.trendData.length} Days`} 
                icon={<Clock className="h-4 w-4" />}
                subValue="range timeline"
                gradient="from-rose-500/20 to-pink-500/5"
                loading={loading}
            />
          </div>

          {/* Second Layer: Visual Trends */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2 rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
                <h3 className="mb-6 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Spending Pulse</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time Series</span>
                </h3>
                 <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.trendData}>
                            <defs>
                                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                            <XAxis 
                                dataKey="date" 
                                hide={analytics.trendData.length > 31}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: "#94a3b8" }}
                            />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSpend)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
                <h3 className="mb-6 text-sm font-bold text-slate-800 dark:text-slate-100 text-center">Composition</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                            <Pie data={analytics.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5}>
                                {analytics.pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                        </RePieChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>

          {/* Third Layer: Behavioral */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
                <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">Behavioral Split</h4>
                <div className="flex items-end justify-between gap-4 h-32 mb-4">
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                            <span>Weekday</span>
                            <span>₹{analytics.behavioral.weekday.toLocaleString()}</span>
                        </div>
                        <div className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden self-end">
                            <motion.div initial={{ height: 0 }} animate={{ height: '100%' }} className="bg-blue-500/40 border-t-2 border-blue-500" style={{ height: `${(analytics.behavioral.weekday / (analytics.behavioral.weekday+analytics.behavioral.weekend || 1))*100}%` }} />
                        </div>
                    </div>
                    <div className="flex-1 space-y-2">
                         <div className="flex items-center justify-between text-[10px] font-bold">
                            <span>Weekend</span>
                            <span>₹{analytics.behavioral.weekend.toLocaleString()}</span>
                        </div>
                        <div className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden self-end">
                            <motion.div initial={{ height: 0 }} animate={{ height: '100%' }} className="bg-rose-500/40 border-t-2 border-rose-500" style={{ height: `${(analytics.behavioral.weekend / (analytics.behavioral.weekday+analytics.behavioral.weekend || 1))*100}%` }} />
                        </div>
                    </div>
                </div>
                <p className="text-[10px] text-center text-slate-400 font-medium">{analytics.behavioral.weekend > analytics.behavioral.weekday ? "Weekend leak detected." : "Stable weekday burn."}</p>
            </div>

            <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
                <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">Week Distribution</h4>
                <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.dayDist}>
                            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                                {analytics.dayDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.7} />)}
                            </Bar>
                             <Tooltip cursor={{ fill: 'transparent' }} />
                             <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                             <YAxis hide />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
                <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">Anomalies</h4>
                <div className="space-y-3 max-h-32 overflow-y-auto">
                    {analytics.anomalies.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-800">
                            <AlertCircle size={14} className="text-rose-500" />
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-bold truncate">{a.note || a.category}</div>
                                <div className="text-[9px] text-rose-600 font-black">₹{a.amount.toLocaleString()}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-[2rem] border border-white/60 bg-white/80 overflow-hidden shadow-xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/85">
            <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
                <h3 className="text-sm font-bold uppercase tracking-wider">Laboratory Audit</h3>
                <div className="flex items-center gap-2">
                    <button onClick={() => { setSortField("date"); setSortOrder(prev => prev === "asc" ? "desc" : "asc"); }} className={cn("px-3 py-2 text-[10px] font-black uppercase rounded-xl", sortField === "date" ? "bg-slate-900 text-white" : "bg-white text-slate-400 border border-slate-100")}>Date {sortField === "date" && (sortOrder === "asc" ? "↑" : "↓")}</button>
                    <button onClick={() => { setSortField("amount"); setSortOrder(prev => prev === "asc" ? "desc" : "asc"); }} className={cn("px-3 py-2 text-[10px] font-black uppercase rounded-xl", sortField === "amount" ? "bg-slate-900 text-white" : "bg-white text-slate-400 border border-slate-100")}>Impact {sortField === "amount" && (sortOrder === "asc" ? "↑" : "↓")}</button>
                </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredExpenses.map((e) => (
                    <div key={e.id} className="flex justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-950/40">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black uppercase">{e.category[0]}</div>
                            <div>
                                <div className="text-sm font-bold">{e.category}</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{e.date} {e.note && `• ${e.note}`}</div>
                            </div>
                        </div>
                        <div className="text-right font-black">-₹{e.amount.toLocaleString()}</div>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </motion.main>
  );
}

function StatCard({ label, value, icon, subValue, gradient, loading }: any) {
    return (
        <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white p-5 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900 transition-all hover:scale-[1.02]">
            <div className={cn("absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br blur-2xl opacity-10", gradient)} />
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
                    <div className="text-slate-400">{icon}</div>
                </div>
                <div>
                    <div className="text-2xl font-black">{loading ? <Skeleton className="h-7 w-24" /> : value}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{subValue}</div>
                </div>
            </div>
        </div>
    );
}
