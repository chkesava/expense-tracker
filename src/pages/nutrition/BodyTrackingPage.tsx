import { useState, useMemo } from 'react';
import { useWeightHistory } from '../../hooks/useWeightHistory';
import { useNutritionProfile } from '../../hooks/useNutritionProfile';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Scale, Plus, Trash2 } from 'lucide-react';
import { toast } from '../../lib/toast';

export default function BodyTrackingPage() {
  const { history, loading, addWeightRecord, deleteWeightRecord } = useWeightHistory();
  const { profile } = useNutritionProfile();

  const [isAdding, setIsAdding] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);

  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0) return toast.error("Enter a valid weight");
    
    try {
      await addWeightRecord(dateInput, w);
      setWeightInput('');
      setIsAdding(false);
      toast.success("Weight recorded!");
    } catch (error) {
      toast.error("Failed to add weight");
    }
  };

  const chartData = useMemo(() => {
    // Recharts likes data in chronological order (oldest to newest) for line charts
    return [...history].reverse().map(h => ({
      date: new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      weight: h.weightKg
    }));
  }, [history]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto py-6 flex flex-col gap-6">
      <div className="flex flex-col mb-2">
        <h1 className="text-2xl font-bold text-foreground">Body Tracking</h1>
        <p className="text-muted-foreground text-sm">Monitor your weight trends</p>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-3xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 text-purple-500 rounded-2xl">
              <Scale size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Weight Trend</h2>
              <p className="text-sm text-muted-foreground">
                Current: {history[0]?.weightKg || profile?.weightKg || 0} kg 
                (Target: {profile?.targetWeightKg || 0} kg)
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-full font-medium hover:bg-purple-600 transition-colors shadow-lg shadow-purple-500/20"
          >
            <Plus size={18} /> Add
          </button>
        </div>

        {isAdding && (
          <form onSubmit={handleAddWeight} className="flex gap-3 mt-2 bg-muted/50 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2">
            <input 
              type="date" 
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 flex-1"
              required
            />
            <input 
              type="number"
              step="0.1"
              placeholder="Weight (kg)"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-28"
              required
            />
            <button type="submit" className="bg-foreground text-background px-4 py-2 rounded-xl text-sm font-semibold">
              Save
            </button>
          </form>
        )}

        {chartData.length > 0 ? (
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={['auto', 'auto']} stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '12px' }}
                  itemStyle={{ color: 'var(--color-foreground)' }}
                />
                {profile?.targetWeightKg && (
                  <ReferenceLine y={profile.targetWeightKg} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'top', value: 'Goal', fill: '#10b981', fontSize: 12 }} />
                )}
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="#a855f7" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#a855f7', strokeWidth: 2, stroke: 'var(--color-card)' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl mt-4">
            No weight history yet
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-semibold px-2">History</h3>
        {history.length > 0 ? history.map((record) => (
          <div key={record.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between group">
            <div>
              <div className="font-medium">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}</div>
              {record.notes && <div className="text-xs text-muted-foreground mt-1">{record.notes}</div>}
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold text-lg">{record.weightKg} <span className="text-sm font-normal text-muted-foreground">kg</span></span>
              <button 
                onClick={() => deleteWeightRecord(record.date)}
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        )) : (
          <p className="text-muted-foreground text-sm px-2">Log your weight to see history here.</p>
        )}
      </div>
    </div>
  );
}
