import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, RotateCcw } from "lucide-react";
import PageShell from "../../../components/layout/PageShell";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/ui/Button";
import PortfolioErrorBoundary from "../components/PortfolioErrorBoundary";
import PortfolioSkeleton from "../components/PortfolioSkeleton";
import OnboardingWizard from "../components/OnboardingWizard";
import PortfolioDashboard from "../components/PortfolioDashboard";
import HoldingsTable from "../components/HoldingsTable";
import AllocationPieChart from "../components/AllocationPieChart";
import AddHoldingModal from "../components/AddHoldingModal";
import CsvImportModal from "../components/CsvImportModal";
import MockBuyModal from "../components/MockBuyModal";
import MockSellModal from "../components/MockSellModal";
import TransactionHistoryModal from "../components/TransactionHistoryModal";
import WatchlistPanel from "../components/WatchlistPanel";
import AlertsPanel from "../components/AlertsPanel";
import OrdersPanel from "../components/OrdersPanel";
import PortfolioCharts from "../components/PortfolioCharts";
import SymbolSearchInput from "../components/SymbolSearchInput";
import { usePortfolioSettings } from "../hooks/usePortfolioSettings";
import { usePortfolioMetrics } from "../hooks/usePortfolioMetrics";
import { useHoldings } from "../hooks/useHoldings";
import { usePortfolioTransactions } from "../hooks/usePortfolioTransactions";
import { useWatchlist } from "../hooks/useWatchlist";
import { useProcessLimitOrders } from "../hooks/useProcessLimitOrders";
import { cn } from "../../../lib/utils";
import type { HoldingWithMetrics, InstrumentType, SearchResult } from "../types";

type TabId = "all" | "stocks" | "etfs" | "mutual_funds" | "gold" | "crypto" | "watchlist" | "alerts" | "orders" | "analytics";

const TABS: { id: TabId; label: string; instrument?: InstrumentType }[] = [
  { id: "all", label: "All Assets" },
  { id: "stocks", label: "Stocks", instrument: "stock" },
  { id: "etfs", label: "ETFs", instrument: "etf" },
  { id: "mutual_funds", label: "Mutual Funds", instrument: "mutual_fund" },
  { id: "gold", label: "Gold", instrument: "gold" },
  { id: "crypto", label: "Crypto", instrument: "crypto" },
  { id: "watchlist", label: "Watchlist" },
  { id: "alerts", label: "Alerts" },
  { id: "orders", label: "Orders" },
  { id: "analytics", label: "Analytics" },
];

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="bento-card p-12 text-center space-y-3">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground">Coming soon in a future release.</p>
    </div>
  );
}

export default function InvestmentsHubPage({ hideHeader }: { hideHeader?: boolean } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("ptab") as TabId) || "all";
  const { needsOnboarding, needsImport, loading: settingsLoading, resetOnboarding, completeOnboarding } = usePortfolioSettings();
  const { deleteHolding } = useHoldings();
  const { transactions } = usePortfolioTransactions();
  const { addToWatchlist } = useWatchlist();

  const currentTab = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const instrumentFilter = currentTab.instrument;

  const {
    holdings,
    summary,
    allocation,
    sectorAllocation,
    etfAllocation,
    snapshots,
    loading,
    quotesLoading,
    isRefreshing,
    lastUpdated,
  } = usePortfolioMetrics(instrumentFilter);

  useProcessLimitOrders(holdings);

  const [showAddHolding, setShowAddHolding] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(needsImport);
  const [buyHolding, setBuyHolding] = useState<HoldingWithMetrics | null>(null);
  const [sellHolding, setSellHolding] = useState<HoldingWithMetrics | null>(null);
  const [historyHolding, setHistoryHolding] = useState<HoldingWithMetrics | null>(null);
  const [editingHolding, setEditingHolding] = useState<HoldingWithMetrics | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (needsImport) setShowAddHolding(true);
  }, [needsImport]);

  useEffect(() => {
    if (searchParams.get("add") !== "true") return;
    setShowAddHolding(true);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("ptab", "stocks");
      next.delete("add");
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  const setTab = useCallback(
    (tab: TabId) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set("ptab", tab);
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

  const tabPills = useMemo(
    () => TABS.map((t) => ({ id: t.id, label: t.label })),
    []
  );

  const handleWatchlistAdd = (result: SearchResult) => {
    void addToWatchlist({
      symbol: result.symbol,
      yahooSymbol: result.yahooSymbol,
      name: result.name,
      exchange: result.exchange,
      instrumentType: result.instrumentType,
    });
  };

  if (settingsLoading || loading) {
    return hideHeader ? <PortfolioSkeleton /> : <PageShell><PortfolioSkeleton /></PageShell>;
  }

  if (needsOnboarding || showOnboarding) {
    const onboardingContent = (
      <>
        <OnboardingWizard
          onComplete={() => {
            setShowOnboarding(false);
            if (needsImport) {
              setShowCsvImport(true);
            } else if (needsOnboarding) {
              setShowAddHolding(true);
            }
          }}
        />
        <CsvImportModal
          isOpen={showCsvImport}
          onClose={() => setShowCsvImport(false)}
          onSuccess={() => {
            setShowCsvImport(false);
            void completeOnboarding();
          }}
        />
      </>
    );
    return hideHeader ? onboardingContent : <PageShell>{onboardingContent}</PageShell>;
  }

  const isAssetTab = activeTab === "all" || !!instrumentFilter;
  const isFutureTab = activeTab === "crypto";

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset your entire portfolio setup? This cannot be undone.")) {
      await resetOnboarding();
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete("ptab");
        return next;
      }, { replace: true });
    }
  };

  const innerContent = (
    <>
      {hideHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
            {tabPills.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as TabId)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
                  activeTab === t.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {isAssetTab && activeTab !== "crypto" && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="text-muted-foreground hover:text-red-500" onClick={handleReset} icon={<RotateCcw size={16} />}>
                Reset Setup
              </Button>
              <Button variant="secondary" onClick={() => setShowCsvImport(true)}>
                Import CSV
              </Button>
              <Button onClick={() => { setEditingHolding(null); setShowAddHolding(true); }} icon={<Plus size={16} />}>
                Add Holding
              </Button>
            </div>
          )}
        </div>
      ) : (
        <PageHeader
          title="Investments"
          subtitle="Read-only portfolio tracking · Live quotes refresh every 15 min"
          tabs={tabPills}
          activeTab={activeTab}
          onTabChange={(tab: string) => setTab(tab as TabId)}
          rightElement={
            isAssetTab && activeTab !== "crypto" ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" className="text-muted-foreground hover:text-red-500" onClick={handleReset} icon={<RotateCcw size={16} />}>
                  Reset Setup
                </Button>
                <Button variant="secondary" onClick={() => setShowCsvImport(true)}>
                  Import CSV
                </Button>
                <Button onClick={() => { setEditingHolding(null); setShowAddHolding(true); }} icon={<Plus size={16} />}>
                  Add Holding
                </Button>
              </div>
            ) : undefined
          }
        />
      )}

      {isAssetTab && !isFutureTab && (
        <div className="space-y-8 mt-6">
          <PortfolioDashboard
            summary={summary}
            isRefreshing={isRefreshing || quotesLoading}
            lastUpdated={lastUpdated}
            liveQuoteCount={holdings.filter((h) => h.hasLiveQuote).length}
            totalHoldings={holdings.length}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AllocationPieChart data={allocation} title="Portfolio Allocation" />
            <AllocationPieChart data={sectorAllocation} title="Sector Allocation" />
            {activeTab === "etfs" && (
              <AllocationPieChart data={etfAllocation} title="ETF Allocation" />
            )}
          </div>

          <HoldingsTable
            holdings={holdings}
            onEdit={(holding) => {
              setEditingHolding(holding);
              setShowAddHolding(true);
            }}
            onDelete={deleteHolding}
            onViewHistory={setHistoryHolding}
            onMockBuy={setBuyHolding}
            onMockSell={setSellHolding}
          />
        </div>
      )}

      {activeTab === "mutual_funds" && holdings.length === 0 && (
        <ComingSoon title="Mutual Funds" />
      )}

      {activeTab === "gold" && holdings.length === 0 && (
        <ComingSoon title="Gold" />
      )}

      {activeTab === "crypto" && <ComingSoon title="Crypto" />}

      {activeTab === "orders" && (
        <div className="mt-6">
          <OrdersPanel />
        </div>
      )}

      {activeTab === "watchlist" && (
        <div className="space-y-6 mt-6">
          <div className="bento-card p-5">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Search size={16} /> Add to Watchlist
            </h3>
            <SymbolSearchInput value="" onSelect={handleWatchlistAdd} />
          </div>
          <WatchlistPanel />
        </div>
      )}

      {activeTab === "alerts" && (
        <div className="mt-6">
          <AlertsPanel />
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="mt-6">
          <PortfolioCharts snapshots={snapshots} transactions={transactions} />
        </div>
      )}

      <AddHoldingModal
        isOpen={showAddHolding}
        onClose={() => {
          setShowAddHolding(false);
          setEditingHolding(null);
        }}
        defaultInstrumentType={activeTab === "etfs" ? "etf" : "stock"}
        editingHolding={editingHolding}
      />
      <CsvImportModal
        isOpen={showCsvImport}
        onClose={() => setShowCsvImport(false)}
      />
      <MockBuyModal
        isOpen={!!buyHolding}
        onClose={() => setBuyHolding(null)}
        holding={buyHolding}
      />
      <MockSellModal
        isOpen={!!sellHolding}
        onClose={() => setSellHolding(null)}
        holding={sellHolding}
      />
      <TransactionHistoryModal
        isOpen={!!historyHolding}
        onClose={() => setHistoryHolding(null)}
        holding={historyHolding}
      />
    </>
  );

  return (
    <PortfolioErrorBoundary>
      {hideHeader ? innerContent : <PageShell>{innerContent}</PageShell>}
    </PortfolioErrorBoundary>
  );
}
