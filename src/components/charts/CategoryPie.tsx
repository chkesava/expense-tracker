import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { chartTokens, getChartColor } from "../../utils/chartColors";

export default function CategoryPie({ data }: { data: any[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center">
        No data for this month
      </p>
    );
  }

  const tokens = chartTokens();

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="category"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={4}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={getChartColor(i, tokens)} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: tokens.tooltipBg,
            borderRadius: 8,
            border: `1px solid ${tokens.tooltipBorder}`,
            color: tokens.foreground,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
