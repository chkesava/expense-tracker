import { cn } from "../lib/utils";
import { QR_STYLES, type QrStyleId } from "../utils/qrStyles";

type QrStylePickerProps = {
  value: QrStyleId;
  onChange: (id: QrStyleId) => void;
  className?: string;
};

export default function QrStylePicker({ value, onChange, className }: QrStylePickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        QR color style
      </p>
      <div className="flex flex-wrap gap-2">
        {QR_STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            title={s.label}
            onClick={() => onChange(s.id)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-all active:scale-95",
              value === s.id
                ? "border-foreground scale-105 shadow-md"
                : "border-transparent opacity-80 hover:opacity-100"
            )}
          >
            <span
              className={cn("h-7 w-7 rounded-lg shadow-inner", s.swatch)}
              style={{
                background: `linear-gradient(135deg, ${s.fg} 45%, ${s.bg} 45%)`,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
