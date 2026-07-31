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
import HoldingCardsGrid from "../components/HoldingCardsGrid";
import AllocationPieChart from "../components/AllocationPieChart";
import AddHoldingModal from "../components/AddHoldingModal";
import CsvImportModal from "../components/CsvImportModal";
import MockBuyModal from "../components/MockBuyModal";
import HistoricalPerformanceChart from "../components/HistoricalPerformanceChart";
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
import { useHistoricalBackfill } from "../hooks/useHistoricalBackfill";
import { cn } from "../../../lib/utils";
import type { HoldingWithMetrics, InstrumentType, SearchResult } from "../types";
import { SipDashboard, SipDetailPanel } from "../../sip";

type TabId = "all" | "stocks" | "etfs" | "mutual_funds" | "gold" | "crypto" | "sip" | "watchlist" | "alerts" | "orders" | "analytics";
type AddableInstrument = "stock" | "etf" | "mutual_fund" | "crypto";

const TABS: { id: TabId; label: string; instrument?: InstrumentType }[] = [
  { id: "all", label: "All Assets" },
  { id: "stocks", label: "Stocks", instrument: "stock" },
  { id: "etfs", label: "ETFs", instrument: "etf" },
  { id: "mutual_funds", label: "Mutual Funds", instrument: "mutual_fund" },
  { id: "gold", label: "Gold", instrument: "gold" },
  { id: "crypto", label: "Crypto", instrument: "crypto" },
  { id: "sip", label: "Virtual SIP" },
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

function defaultInstrumentForTab(tab: TabId): AddableInstrument {
  if (tab === "etfs") return "etf";
  if (tab === "mutual_funds") return "mutual_fund";
  if (tab === "crypto") return "crypto";
  return "stock";
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
  const isGoldTab = activeTab === "gold";
  const isSipTab = activeTab === "sip";
  const showLiveAssetView = (activeTab === "all" || !!instrumentFilter) && !isGoldTab && !isSipTab;
  const showCardGrid = activeTab === "mutual_funds" || activeTab === "crypto";
  const selectedSipId = searchParams.get("sipId");

  const setSelectedSip = useCallback(
    (id: string | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("ptab", "sip");
        if (id) next.set("sipId", id);
        else next.delete("sipId");
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

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

  const { syncHistoricalData, syncing } = useHistoricalBackfill();

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

  const addHoldingActions = showLiveAssetView ? (
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
  ) : undefined;

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
          {addHoldingActions}
        </div>
      ) : (
        <PageHeader
          title="Investments"
          subtitle="Live portfolio tracking · Quotes refresh every 15 min"
          tabs={tabPills}
          activeTab={activeTab}
          onTabChange={(tab: string) => setTab(tab as TabId)}
          rightElement={addHoldingActions}
        />
      )}

      {showLiveAssetView && (
        <div className="space-y-8 mt-6">
          <PortfolioDashboard
            summary={summary}
            isRefreshing={isRefreshing || quotesLoading}
            lastUpdated={lastUpdated}
            liveQuoteCount={holdings.filter((h) => h.hasLiveQuote).length}
            totalHoldings={holdings.length}
          />

          {(activeTab === "all" || activeTab === "stocks" || activeTab === "etfs") && (
            <HistoricalPerformanceChart
              snapshots={snapshots}
              onSyncHistory={syncHistoricalData}
              isSyncing={syncing}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AllocationPieChart data={allocation} title="Portfolio Allocation" />
            {(activeTab === "all" || activeTab === "stocks" || activeTab === "etfs") && (
              <AllocationPieChart data={sectorAllocation} title="Sector Allocation" />
            )}
            {activeTab === "etfs" && (
              <AllocationPieChart data={etfAllocation} title="ETF Allocation" />
            )}
          </div>

          {showCardGrid && holdings.length > 0 && (
            <HoldingCardsGrid holdings={holdings} />
          )}

          {showCardGrid && holdings.length === 0 && (
            <div className="bento-card p-10 text-center space-y-3">
              <h3 className="text-lg font-bold">
                {activeTab === "crypto" ? "No crypto holdings yet" : "No mutual fund holdings yet"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Add a holding to track live prices and profit &amp; loss.
              </p>
              <Button onClick={() => { setEditingHolding(null); setShowAddHolding(true); }} icon={<Plus size={16} />}>
                Add Holding
              </Button>
            </div>
          )}

          {!showCardGrid && (
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
          )}

          {showCardGrid && holdings.length > 0 && (
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
          )}
        </div>
      )}

      {isGoldTab && holdings.length === 0 && (
        <div className="mt-6">
          <ComingSoon title="Gold" />
        </div>
      )}

      {isSipTab && (
        <div className="mt-6">
          {selectedSipId ? (
            <SipDetailPanel sipId={selectedSipId} onBack={() => setSelectedSip(null)} />
          ) : (
            <SipDashboard
              selectedSipId={selectedSipId}
              onSelectSip={setSelectedSip}
            />
          )}
        </div>
      )}

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
        defaultInstrumentType={defaultInstrumentForTab(activeTab)}
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
