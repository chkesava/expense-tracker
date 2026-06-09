import { lazy, Suspense, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Search, CalendarDays } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import PageShell from "../components/layout/PageShell";

type InsightsTab = "analytics" | "yearly" | "search";

import AnalyticsPage from "./AnalyticsPage";
import AnalysisLab from "./AnalysisLab";
import YearlyAnalytics from "./YearlyAnalytics";

function TabFallback() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

export default function InsightsHub() {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get("tab");
  const activeTab = (tabFromUrl && ["analytics", "yearly", "search"].includes(tabFromUrl))
    ? (tabFromUrl as InsightsTab)
    : "analytics";

  const handleTabChange = useCallback((tabId: string) => {
    if (tabId === activeTab) return;

    const params = new URLSearchParams(location.search);
    params.set("tab", tabId);
    navigate({ search: params.toString() }, { replace: true });
  }, [activeTab, location.search, navigate]);

  const tabs = useMemo(() => [
    { id: "analytics", label: "Performance", icon: <BarChart3 size={16} /> },
    { id: "yearly",    label: "Yearly",      icon: <CalendarDays size={16} /> },
    { id: "search",    label: "Discovery",   icon: <Search size={16} /> },
  ], []);

  return (
    <PageShell width="standard">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <PageHeader
          title="Insights Hub"
          subtitle="Advanced financial analytics and discovery."
          icon={<BarChart3 size={24} />}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabAriaLabel="Insights sections"
          tabLayoutId="insights-tab-pill"
        />

        <AnimatePresence>
          <motion.div
            key={activeTab}
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Suspense fallback={<TabFallback />}>
              {activeTab === "analytics" && <AnalyticsPage hideHeader />}
              {activeTab === "yearly" && <YearlyAnalytics />}
              {activeTab === "search" && <AnalysisLab hideHeader />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </PageShell>
  );
}
