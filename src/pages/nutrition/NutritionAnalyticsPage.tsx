import { useMemo } from 'react';
import { useNutritionHistory } from '../../hooks/useNutritionHistory';
import { useNutritionProfile } from '../../hooks/useNutritionProfile';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, Cell, PieChart, Pie } from 'recharts';
import { ActivitySquare, Flame, Droplets, Download } from 'lucide-react';
import { exportNutritionCSV, exportNutritionPDF } from '../../utils/nutritionExport';

export default function NutritionAnalyticsPage() {
  const { logs, loading } = useNutritionHistory(7);
  const { goals } = useNutritionProfile();

  const calorieData = useMemo(() => {
    return logs.map(log => ({
      date: new Date(log.date).toLocaleDateString(undefined, { weekday: 'short' }),
      calories: Math.round(log.nutritionSummary?.calories || 0),
    }));
  }, [logs]);

  const macroAverages = useMemo(() => {
    if (logs.length === 0) return [];
    
    let p = 0, c = 0, f = 0;
    logs.forEach(log => {
      p += log.nutritionSummary?.protein || 0;
      c += log.nutritionSummary?.carbs || 0;
      f += log.nutritionSummary?.fat || 0;
    });

    const days = logs.length;
    return [
      { name: 'Protein', value: Math.round(p / days), color: '#3b82f6' }, // blue-500
      { name: 'Carbs', value: Math.round(c / days), color: '#f59e0b' }, // amber-500
      { name: 'Fat', value: Math.round(f / days), color: '#ef4444' }, // red-500
    ].filter(m => m.value > 0);
  }, [logs]);

  const avgWater = useMemo(() => {
    if (logs.length === 0) return 0;
    const total = logs.reduce((acc, log) => acc + (log.waterLoggedMl || 0), 0);
    return Math.round(total / logs.length);
  }, [logs]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Loading Analytics...</div>;
  }

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto py-6 flex flex-col gap-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground text-sm">Last 7 Days Summary</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => exportNutritionCSV(logs)}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            <Download size={14} /> CSV
          </button>
          <button 
            onClick={() => exportNutritionPDF(logs)}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Calories Chart */}
      <div className="bg-card border border-border shadow-sm rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-500/20 text-emerald-500 rounded-2xl">
            <Flame size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Calorie Intake</h2>
            <p className="text-sm text-muted-foreground">Daily average vs Target</p>
          </div>
        </div>

        {calorieData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calorieData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: 'var(--color-muted)' }}
                  contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '12px' }}
                  itemStyle={{ color: 'var(--color-foreground)' }}
                />
                {goals?.targetCalories && (
                  <ReferenceLine y={goals.targetCalories} stroke="#10b981" strokeDasharray="3 3" />
                )}
                <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
                  {calorieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={goals?.targetCalories && entry.calories > goals.targetCalories ? '#ef4444' : '#10b981'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
            No logs found for the last 7 days.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Macros Breakdown */}
        <div className="bg-card border border-border shadow-sm rounded-3xl p-6 flex flex-col items-center">
          <div className="flex items-center gap-3 self-start mb-4">
            <div className="p-2 bg-blue-500/20 text-blue-500 rounded-xl">
              <ActivitySquare size={20} />
            </div>
            <h2 className="text-md font-semibold">Avg Macros</h2>
          </div>

          {macroAverages.length > 0 ? (
            <div className="relative h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macroAverages}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {macroAverages.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '12px' }}
                    itemStyle={{ color: 'var(--color-foreground)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-xs text-muted-foreground font-medium">Daily Avg</span>
              </div>
            </div>
          ) : (
             <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                No macro data.
             </div>
          )}
          
          <div className="flex gap-4 mt-2">
            {macroAverages.map(m => (
              <div key={m.name} className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground">{m.name}</span>
                <span className="text-sm font-bold" style={{ color: m.color }}>{m.value}g</span>
              </div>
            ))}
          </div>
        </div>

        {/* Water Averages */}
        <div className="bg-card border border-border shadow-sm rounded-3xl p-6 flex flex-col justify-between">
           <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 text-blue-500 rounded-xl">
              <Droplets size={20} />
            </div>
            <h2 className="text-md font-semibold">Avg Water</h2>
          </div>
          
          <div className="flex flex-col items-center justify-center flex-1">
            <span className="text-4xl font-bold text-blue-500">{avgWater} <span className="text-xl text-muted-foreground">ml</span></span>
            <span className="text-sm font-medium text-muted-foreground mt-2">Target: {goals?.waterMl || 0} ml</span>
          </div>
        </div>
      </div>
    </div>
  );
}
