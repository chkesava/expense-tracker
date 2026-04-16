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
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-blue-600 shadow-sm backdrop-blur-xl dark:bg-slate-900/80 dark:text-blue-400">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
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
        <div className="flex gap-2 p-1 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800/60 overflow-x-auto scrollbar-hide no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-black transition-all",
                  isActive
                    ? "bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900"
                    : "text-slate-500 hover:bg-white/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
                )}
              >
                {tab.icon && <span>{tab.icon}</span>}
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
