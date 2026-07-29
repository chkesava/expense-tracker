import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { AllocationSlice } from "../types";

interface AllocationPieChartProps {
  data: AllocationSlice[];
  title: string;
  height?: number;
}

export default function AllocationPieChart({
  data,
  title,
  height = 220,
}: AllocationPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="bento-card p-6 text-center text-sm text-muted-foreground">
        No allocation data
      </div>
    );
  }

  return (
    <div className="bento-card p-5 space-y-4">
      <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
          >
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`${Number(value ?? 0).toFixed(1)}%`, "Allocation"]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--background)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2">
        {data.slice(0, 6).map((d) => (
          <span
            key={d.label}
            className="inline-flex items-center gap-1.5 text-xs font-medium"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            {d.label} ({d.value.toFixed(1)}%)
          </span>
        ))}
      </div>
    </div>
  );
}
