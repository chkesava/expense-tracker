import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { COLORS } from "../../utils/chartColors";

export default function CategoryPie({ data }: { data: any[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center">
        No data for this month
      </p>
    );
  }

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
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
