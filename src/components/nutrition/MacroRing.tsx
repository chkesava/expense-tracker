import React from "react";
import { motion } from "framer-motion";

interface MacroRingProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string; // e.g. text-emerald-500
  bgColor: string; // e.g. text-emerald-500/20
  size?: number;
  strokeWidth?: number;
}

export default function MacroRing({
  label,
  current,
  target,
  unit,
  color,
  bgColor,
  size = 80,
  strokeWidth = 6,
}: MacroRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Cap at 100% for the visual ring, but allow the text to go over
  const safeTarget = target > 0 ? target : 1;
  const percent = Math.min((current / safeTarget) * 100, 100);
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Background Ring */}
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className={`${bgColor} transition-colors`}
          />
          {/* Progress Ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            strokeLinecap="round"
            className={color}
          />
        </svg>
        
        {/* Inner Text */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-sm font-bold leading-none text-foreground">
            {Math.round(current)}
          </span>
          <span className="text-[10px] text-muted-foreground leading-none mt-1">
            / {target}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
