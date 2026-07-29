# Portfolio Tracker Module

Paper trading / portfolio tracker for Stocks & ETFs inside the Expense Tracker app. **No real orders are placed.**

## Quick Start

1. Open **Investments** from the sidebar (`/investments`)
2. Complete the onboarding wizard (initial cash + import choice)
3. Add holdings via symbol search (Twelve Data)
4. Use **Mock Buy** / **Mock Sell** to simulate trades

## Folder Structure

```
src/features/portfolio/
├── components/          # UI (dashboard, holdings table, modals, charts)
├── hooks/               # Firestore + TanStack Query hooks
├── pages/               # InvestmentsHubPage
├── schemas/             # Zod validation schemas
├── services/            # Market data API + portfolio math
├── types/               # TypeScript interfaces
└── utils/               # Symbol formatting, styles
```

## Firestore Schema

All collections live under `users/{userId}/`:

| Collection | Purpose |
|------------|---------|
| `portfolioSettings/config` | Onboarding state, cash balance |
| `holdings` | Stock/ETF positions |
| `portfolioTransactions` | BUY, SELL, BONUS, SPLIT, DIVIDEND |
| `watchlist` | Tracked symbols |
| `alerts` | Price/profit/loss alerts |
| `portfolioSnapshots/{YYYY-MM-DD}` | Daily portfolio history |

> **Note:** Legacy FD/MF investments remain in `investments` (Ledger tab). Portfolio stocks use `holdings`.

### Holding Document

```typescript
{
  symbol: "RELIANCE",
  // Legacy storage field name; it contains the Twelve Data ticker used for quote lookups.
  yahooSymbol: "AAPL",
  name: "Reliance Industries",
  exchange: "NSE" | "BSE" | "US",
  instrumentType: "stock" | "etf",
  quantity: 10,
  averageBuyPrice: 2450.5,
  targetPrice?: 2600, // one-time in-app alert when the live price reaches it
  broker?: "Zerodha",
  datePurchased?: "2025-01-15",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Transaction Document

```typescript
{
  holdingId: string,
  symbol: string,
  type: "BUY" | "SELL" | "BONUS" | "SPLIT" | "DIVIDEND",
  quantity: number,
  price: number,
  fees: number,
  broker?: string,
  date: "YYYY-MM-DD",
  notes?: string,
  orderStatus: "pending" | "executed" | "cancelled",
  createdAt: Timestamp
}
```

## Market Data

- **Provider:** Twelve Data
- **Dev proxy:** `/api/twelve-data` → `api.twelvedata.com` (see `vite.config.ts`)
- **Production:** Netlify routes the same path through `netlify/functions/twelve-data.mjs`
- **Token:** Set `TWELVE_DATA_API_KEY` in the local/server environment. It is never exposed as a `VITE_` browser variable.
- **Refresh:** Every 15 minutes via TanStack Query `refetchInterval`
- **Offline-safe:** Missing tokens, unavailable networks, and unsupported symbols show cost-basis values instead of interrupting portfolio tracking.

> Twelve Data's symbol search and quote endpoints supply the provider data. NSE/BSE availability and data delay depend on the Twelve Data plan; the tracker falls back to cost basis when a quote is unavailable.

### Quote Fields

Current price, previous close, day change, 52-week high/low, volume, market cap (when available), currency.

## Calculations

| Metric | Formula |
|--------|---------|
| Portfolio Value | Σ(currentPrice × quantity) |
| Invested Value | Σ(averageBuyPrice × quantity) |
| Profit | currentValue − investedValue |
| Profit % | profit / investedValue × 100 |
| Avg Buy (mock buy) | Weighted average of existing + new lots |
| Net Worth | Cash + legacy investments + portfolio value − liabilities |

## Net Worth Integration

`AccountsPage` uses `usePortfolioNetWorth()` to pass live `portfolioValue` into `NetWorthCard`. Values update automatically when market quotes refresh.

## Tech Stack

- **TanStack Query** — market data caching & auto-refresh
- **Zod + React Hook Form** — form validation
- **Firestore onSnapshot** — real-time holdings/transactions
- **Recharts** — allocation pies, growth charts
- **Framer Motion** — onboarding & card animations

## Routes & Navigation

| Path | Page |
|------|------|
| `/investments` | Portfolio hub (Stocks, ETFs, Watchlist, Alerts, Analytics) |
| `/investments/:id` | Legacy FD/MF investment detail (unchanged) |

## Deploy Checklist

1. `npm run deploy:rules` — deploy updated Firestore rules
2. Add `TWELVE_DATA_API_KEY` to the Netlify environment variables
3. Verify `/api/twelve-data/quote?symbol=AAPL` returns a quote after deployment

## Future Work

- Mutual Funds, Gold tabs (placeholders ready)
- Crypto tab
- Push notifications for alerts (currently in-app toasts)
- Broker logo images via external CDN
