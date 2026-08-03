import { cn } from "../../lib/utils";
import { useSystemSettings } from "../../hooks/useSystemSettings";
import { currencySymbol, formatAmountNumber } from "../../utils/formatCurrency";

interface AmountProps {
  value: number;
  prefix?: string;
  className?: string;
  showBlur?: boolean;
  /** Force fixed decimal places (default: smart 0–2). */
  fractionDigits?: number;
}

export default function Amount({
  value,
  prefix,
  className,
  showBlur = true,
  fractionDigits,
}: AmountProps) {
  const { settings } = useSystemSettings();
  const currency = settings?.defaultCurrency || "INR";
  const displayPrefix = prefix !== undefined ? prefix : currencySymbol(currency);

  return (
    <span className={cn("tabular-nums", className, showBlur && "privacy-blur")}>
      {displayPrefix}
      {formatAmountNumber(value, currency, { fractionDigits })}
    </span>
  );
}
