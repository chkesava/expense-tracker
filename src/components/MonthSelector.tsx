interface Props {
  months: string[];
  value: string;
  onChange: (month: string) => void;
}

export default function MonthSelector({ months, value, onChange }: Props) {
  if (!months.length) return null;

  return (
    <div className="month-selector">
      <label className="month-label">Month</label>
      <select
        className="month-select"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {months.map(month => (
          <option key={month} value={month}>
            {month}
          </option>
        ))}
      </select>
    </div>
  );
}
