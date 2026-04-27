import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tabId: any) => void;
  tabs?: Tab[];
  rightElement?: React.ReactNode;
}

export default function PageHeader({ 
  title, 
  subtitle, 
  icon, 
  activeTab, 
  onTabChange, 
  tabs,
  rightElement 
}: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-slate-900/40 text-slate-900 dark:text-white border border-slate-200 dark:border-white/5 shadow-2xl shadow-slate-900/5">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {rightElement && (
          <div className="w-full sm:w-auto">
            {rightElement}
          </div>
        )}
      </div>

      {tabs && tabs.length > 0 && (
        <div className="flex gap-1 p-1 bg-slate-100/50 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-slate-200/50 dark:border-white/5 overflow-x-auto scrollbar-hide no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 whitespace-nowrap rounded-lg px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all",
                  isActive
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tab-pill"
                    className="absolute inset-0 bg-white dark:bg-slate-900 shadow-sm rounded-lg border border-slate-200/50 dark:border-white/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {tab.icon && <span>{tab.icon}</span>}
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
