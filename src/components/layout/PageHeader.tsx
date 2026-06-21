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
  tabAriaLabel?: string;
  tabLayoutId?: string;
}

export default function PageHeader({ 
  title, 
  subtitle, 
  icon, 
  activeTab, 
  onTabChange, 
  tabs,
  rightElement,
  tabAriaLabel = "Page sections",
  tabLayoutId = "active-tab-pill",
}: PageHeaderProps) {
  return (
    <div className="mb-5 space-y-3 md:mb-6 md:space-y-4">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          {icon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm md:h-14 md:w-14 md:rounded-2xl">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-normal text-slate-900 dark:text-white md:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 line-clamp-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 md:tracking-[0.16em]">
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
        <div
          role="tablist"
          aria-label={tabAriaLabel}
          className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/50 p-1 scrollbar-hide no-scrollbar"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (!isActive) onTabChange?.(tab.id);
                }}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                className={cn(
                  "relative flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] transition-all sm:px-4 md:px-6 md:py-2.5 md:text-xs md:tracking-widest",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId={tabLayoutId}
                    className="absolute inset-0 rounded-lg border border-border bg-card shadow-sm"
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
