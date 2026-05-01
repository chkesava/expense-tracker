import { cn } from "../../lib/utils";

interface AmountProps {
  value: number;
  prefix?: string;
  className?: string;
  showBlur?: boolean;
}

export default function Amount({ value, prefix = "₹", className, showBlur = true }: AmountProps) {
  return (
    <span className={cn(className, showBlur && "privacy-blur")}>
      {prefix}{value.toLocaleString()}
    </span>
  );
}
