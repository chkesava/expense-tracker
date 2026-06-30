import { cn } from "../../lib/utils";
import { useSystemSettings } from "../../hooks/useSystemSettings";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  AED: "د.إ",
};

interface AmountProps {
  value: number;
  prefix?: string;
  className?: string;
  showBlur?: boolean;
}

export default function Amount({ value, prefix, className, showBlur = true }: AmountProps) {
  const { settings } = useSystemSettings();
  const defaultSymbol = CURRENCY_SYMBOLS[settings?.defaultCurrency || "INR"] || "₹";
  const displayPrefix = prefix !== undefined ? prefix : defaultSymbol;

  return (
    <span className={cn(className, showBlur && "privacy-blur")}>
      {displayPrefix}{value.toLocaleString()}
    </span>
  );
}
