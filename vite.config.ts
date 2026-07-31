/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { ipv4Fetch } from './netlify/functions/_ipv4'

async function providerFetch(url: string, signal?: AbortSignal) {
  return ipv4Fetch(url, { signal });
}

function yahooStockPlugin() {
  return {
    name: 'yahoo-stock-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url && (req.url.startsWith('/.netlify/functions/stock') || req.url.startsWith('/api/stock'))) {
          const url = new URL(req.url, 'http://localhost');
          const rawSymbol = url.searchParams.get('symbol');
          if (!rawSymbol) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: false, message: "Query parameter 'symbol' is required" }));
          }

          let symbol = rawSymbol.trim().toUpperCase();
          if (!symbol.includes('.') && !['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'QQQ', 'SPY'].includes(symbol)) {
            symbol = `${symbol}.NS`;
          }

          try {
            const m: any = await import('yahoo-finance2');
            const TargetClass = m?.YahooFinance || m?.default?.YahooFinance || m?.default || m;
            let yahooFinance: any;
            if (typeof TargetClass === 'function') {
              try {
                yahooFinance = new TargetClass({ suppressNotices: ['yahooSurvey'] });
              } catch {
                yahooFinance = new TargetClass();
              }
            } else {
              yahooFinance = TargetClass;
            }

            const quote: any = await yahooFinance.quote(symbol);
            if (!quote || typeof quote.regularMarketPrice !== 'number') {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: false, message: `No quote found for ${symbol}` }));
            }

            const price = quote.regularMarketPrice ?? quote.postMarketPrice ?? quote.preMarketPrice ?? 0;
            const previousClose = quote.regularMarketPreviousClose ?? price;
            const change = quote.regularMarketChange ?? (price - previousClose);
            const changePercent = quote.regularMarketChangePercent ?? (previousClose > 0 ? (change / previousClose) * 100 : 0);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
              symbol: quote.symbol || symbol,
              name: quote.longName || quote.shortName || symbol,
              price,
              currency: quote.currency || 'INR',
              change,
              changePercent,
              previousClose,
              dayHigh: quote.regularMarketDayHigh ?? price,
              dayLow: quote.regularMarketDayLow ?? price,
              marketTime: quote.regularMarketTime ? new Date(quote.regularMarketTime).toISOString() : new Date().toISOString(),
              exchange: quote.exchange || 'NSE',
              success: true,
            }));
          } catch (err: any) {
            console.error(`Vite Yahoo Finance plugin error for ${symbol}:`, err?.message || err);
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: false, message: 'Unable to fetch stock quote right now. Please try again later.' }));
          }
        } else if (req.url && (req.url.startsWith('/.netlify/functions/historical') || req.url.startsWith('/api/historical'))) {
          const url = new URL(req.url, 'http://localhost');
          const rawSymbols = url.searchParams.get("symbols");
          const period1 = url.searchParams.get("period1");
          const period2 = url.searchParams.get("period2");
          
          if (!rawSymbols || !rawSymbols.trim()) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: false, message: "Query parameter 'symbols' is required" }));
          }

          const symbolsList = rawSymbols.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

          const queryOptions: any = { interval: '1d' };
          if (period1) queryOptions.period1 = period1;
          else {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            queryOptions.period1 = oneYearAgo.toISOString().split("T")[0];
          }
          if (period2) queryOptions.period2 = period2;
          else queryOptions.period2 = new Date().toISOString().split("T")[0];

          try {
            const m: any = await import('yahoo-finance2');
            const TargetClass = m?.YahooFinance || m?.default?.YahooFinance || m?.default || m;
            let yahooFinance: any;
            if (typeof TargetClass === 'function') {
              try { yahooFinance = new TargetClass({ suppressNotices: ['yahooSurvey'] }); } 
              catch { yahooFinance = new TargetClass(); }
            } else { yahooFinance = TargetClass; }

            const results: Record<string, any[]> = {};
            const chunkSize = 15;
            for (let i = 0; i < symbolsList.length; i += chunkSize) {
              const chunk = symbolsList.slice(i, i + chunkSize);
              await Promise.all(
                chunk.map(async (symbol) => {
                  let querySymbol = symbol;
                  if (!querySymbol.includes(".") && !["AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "QQQ", "SPY"].includes(querySymbol)) {
                    querySymbol = `${querySymbol}.NS`;
                  }
                  try {
                    const hist = await yahooFinance.historical(querySymbol, queryOptions);
                    results[symbol] = hist;
                  } catch (e: any) {
                    console.warn(`Vite historical error for ${querySymbol}:`, e.message);
                    results[symbol] = [];
                  }
                })
              );
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true, data: results }));
          } catch (err: any) {
            console.error(`Vite Yahoo Finance historical error:`, err?.message || err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: false, message: 'Unable to fetch historical data right now. Please try again later.' }));
          }
        } else if (req.url && (req.url.startsWith('/.netlify/functions/mutualFunds') || req.url.startsWith('/api/mutual-funds'))) {
          const url = new URL(req.url, 'http://localhost');
          const schemeCodeParam = url.searchParams.get('schemeCode')?.trim();
          const q = url.searchParams.get('q')?.trim();
          res.setHeader('Content-Type', 'application/json');

          if (!schemeCodeParam && !q) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ success: false, message: "Query parameter 'schemeCode' or 'q' is required" }));
          }

          try {
            const fetchMf = async (path: string) => {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 20_000);
              try {
                return await providerFetch(`https://api.mfapi.in${path}`, controller.signal);
              } finally {
                clearTimeout(timer);
              }
            };

            const normalizeQuote = (schemeCode: string, payload: any) => {
              const meta = payload?.meta ?? {};
              const rows: any[] = Array.isArray(payload?.data) ? payload.data : [];
              const latest = rows[0];
              const previous = rows[1];
              const nav = Number.parseFloat(String(latest?.nav ?? ''));
              if (!Number.isFinite(nav)) {
                throw Object.assign(new Error('No NAV'), { status: 404 });
              }
              const previousNav = previous?.nav != null ? Number.parseFloat(String(previous.nav)) : null;
              const change = previousNav != null ? nav - previousNav : 0;
              const changePercent = previousNav != null && previousNav > 0 ? (change / previousNav) * 100 : 0;
              return {
                schemeCode: String(meta.scheme_code ?? schemeCode),
                schemeName: meta.scheme_name || `Scheme ${schemeCode}`,
                fundHouse: meta.fund_house || '',
                nav,
                previousNav: Number.isFinite(previousNav as number) ? previousNav : null,
                change,
                changePercent,
                date: latest?.date || new Date().toISOString().slice(0, 10),
                currency: 'INR',
                success: true,
              };
            };

            const fetchLatest = async (schemeCode: string) => {
              let r = await fetchMf(`/mf/${encodeURIComponent(schemeCode)}/latest`);
              if (r.ok) {
                const payload: any = await r.json();
                if (payload?.meta || payload?.data) return payload;
              }
              r = await fetchMf(`/mf/${encodeURIComponent(schemeCode)}`);
              if (!r.ok) throw Object.assign(new Error('Not found'), { status: r.status === 404 ? 404 : 502 });
              return r.json() as Promise<any>;
            };

            if (q && !schemeCodeParam) {
              if (/^\d+$/.test(q)) {
                const payload = await fetchLatest(q);
                res.statusCode = 200;
                return res.end(JSON.stringify(normalizeQuote(q, payload)));
              }
              const searchRes = await fetchMf(`/mf/search?q=${encodeURIComponent(q)}`);
              if (!searchRes.ok) {
                res.statusCode = 502;
                return res.end(JSON.stringify({ success: false, message: 'Failed to search mutual funds' }));
              }
              const results = await searchRes.json();
              const list = Array.isArray(results) ? results : [];
              res.statusCode = 200;
              return res.end(JSON.stringify({
                success: true,
                results: list.slice(0, 20).map((item: any) => ({
                  schemeCode: String(item.schemeCode ?? item.scheme_code ?? ''),
                  schemeName: String(item.schemeName ?? item.scheme_name ?? ''),
                })).filter((item: { schemeCode: string }) => item.schemeCode),
              }));
            }

            if (!/^\d+$/.test(schemeCodeParam!)) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ success: false, message: 'Invalid scheme code. Use the numeric AMFI scheme code.' }));
            }
            const payload = await fetchLatest(schemeCodeParam!);
            res.statusCode = 200;
            return res.end(JSON.stringify(normalizeQuote(schemeCodeParam!, payload)));
          } catch (err: any) {
            console.error('Vite mutualFunds plugin error:', err?.message || err, err?.cause || '');
            res.statusCode = err?.status === 404 ? 404 : err?.name === 'AbortError' ? 504 : 502;
            return res.end(JSON.stringify({
              success: false,
              message: err?.status === 404
                ? 'Mutual fund scheme not found. Check the scheme code and try again.'
                : err?.name === 'AbortError'
                  ? 'Mutual fund data request timed out. Please try again.'
                  : 'Unable to fetch mutual fund data right now. Please try again later.',
            }));
          }
        } else if (req.url && (req.url.startsWith('/.netlify/functions/crypto') || req.url.startsWith('/api/crypto'))) {
          const url = new URL(req.url, 'http://localhost');
          const idsParam = url.searchParams.get('ids')?.trim();
          const listOnly = url.searchParams.get('list') === '1';
          res.setHeader('Content-Type', 'application/json');

          const COIN_META: Record<string, { name: string; symbol: string }> = {
            bitcoin: { name: 'Bitcoin', symbol: 'BTC' },
            ethereum: { name: 'Ethereum', symbol: 'ETH' },
            solana: { name: 'Solana', symbol: 'SOL' },
            ripple: { name: 'XRP', symbol: 'XRP' },
            binancecoin: { name: 'BNB', symbol: 'BNB' },
            dogecoin: { name: 'Dogecoin', symbol: 'DOGE' },
          };

          if (listOnly) {
            res.statusCode = 200;
            return res.end(JSON.stringify({
              success: true,
              coins: Object.entries(COIN_META).map(([coinId, meta]) => ({ coinId, name: meta.name, symbol: meta.symbol })),
            }));
          }

          if (!idsParam) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ success: false, message: "Query parameter 'ids' is required (comma-separated coin ids)" }));
          }

          const ids = [...new Set(idsParam.split(',').map((id) => id.trim().toLowerCase()).filter(Boolean))];
          try {
            const endpoint =
              `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(','))}` +
              `&vs_currencies=inr&include_market_cap=true&include_24hr_change=true&include_last_updated_at=true`;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 20_000);
            let cgRes: Awaited<ReturnType<typeof providerFetch>>;
            try {
              cgRes = await providerFetch(endpoint, controller.signal);
            } finally {
              clearTimeout(timer);
            }

            if (!cgRes.ok) {
              res.statusCode = cgRes.status === 429 ? 429 : 502;
              return res.end(JSON.stringify({
                success: false,
                message: cgRes.status === 429
                  ? 'Crypto price service is rate-limited. Please try again shortly.'
                  : 'Crypto price service is temporarily unavailable. Please try again later.',
              }));
            }

            const payload = (await cgRes.json()) as Record<string, any>;
            const quotes = ids.map((coinId) => {
              const row = payload[coinId];
              if (!row || typeof row.inr !== 'number') return null;
              const meta = COIN_META[coinId] ?? { name: coinId, symbol: coinId.slice(0, 4).toUpperCase() };
              const changePercent24h = typeof row.inr_24h_change === 'number' ? row.inr_24h_change : 0;
              const price = row.inr;
              return {
                coinId,
                name: meta.name,
                symbol: meta.symbol,
                price,
                change24h: price * (changePercent24h / 100),
                changePercent24h,
                marketCap: typeof row.inr_market_cap === 'number' ? row.inr_market_cap : 0,
                currency: 'INR',
                lastUpdated: typeof row.last_updated_at === 'number'
                  ? new Date(row.last_updated_at * 1000).toISOString()
                  : new Date().toISOString(),
                success: true,
              };
            }).filter(Boolean);

            if (quotes.length === 0) {
              res.statusCode = 404;
              return res.end(JSON.stringify({
                success: false,
                message: 'Invalid crypto id. Use a supported CoinGecko coin id (e.g. bitcoin).',
              }));
            }

            res.statusCode = 200;
            return res.end(JSON.stringify({ success: true, quotes }));
          } catch (err: any) {
            console.error('Vite crypto plugin error:', err?.message || err);
            res.statusCode = err?.name === 'AbortError' ? 504 : 502;
            return res.end(JSON.stringify({
              success: false,
              message: err?.name === 'AbortError'
                ? 'Crypto price request timed out. Please try again.'
                : 'Unable to fetch crypto prices right now. Please try again later.',
            }));
          }
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(() => {
  return {
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    yahooStockPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'vite.svg'],
      manifest: {
        name: 'Expense Tracker',
        short_name: 'Expenses',
        description: 'Track your expenses with ease',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'logo.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
            }
          }
        ]
      },
    }),
  ],
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "e2e/**", "tests/**", "dist"],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          'vendor-utils': ['jspdf', 'jspdf-autotable', 'framer-motion', 'lucide-react'],
        }
      }
    }
  },
  }
})
