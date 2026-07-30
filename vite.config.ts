/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa';

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
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: false, message: err?.message || 'Error fetching stock data' }));
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
