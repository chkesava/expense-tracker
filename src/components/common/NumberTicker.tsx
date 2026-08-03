import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { formatAmountNumber } from "../../utils/formatCurrency";

export default function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className,
  locale = "en-IN",
}: {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  className?: string;
  /** Intl locale for digit grouping. Defaults to en-IN. */
  locale?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (isInView) {
      setTimeout(() => {
        motionValue.set(direction === "down" ? 0 : value);
      }, delay * 1000);
    }
  }, [motionValue, isInView, delay, value, direction]);

  useEffect(() => {
    springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = formatAmountNumber(Math.round(latest), "INR", {
          locale,
          fractionDigits: 0,
        });
      }
    });
  }, [springValue, locale]);

  return <span className={className} ref={ref} />;
}
