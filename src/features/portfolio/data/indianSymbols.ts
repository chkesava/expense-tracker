import type { SearchResult } from "../types";

/** Curated NSE/BSE symbols — used for instant local search without a network request. */
export const INDIAN_SYMBOLS: SearchResult[] = [
  { symbol: "RELIANCE", name: "Reliance Industries Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "RELIANCE.NS" },
  { symbol: "TCS", name: "Tata Consultancy Services Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "TCS.NS" },
  { symbol: "INFY", name: "Infosys Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "INFY.NS" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "HDFCBANK.NS" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "ICICIBANK.NS" },
  { symbol: "SBIN", name: "State Bank of India", exchange: "NSE", instrumentType: "stock", yahooSymbol: "SBIN.NS" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "BHARTIARTL.NS" },
  { symbol: "ITC", name: "ITC Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "ITC.NS" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "HINDUNILVR.NS" },
  { symbol: "LT", name: "Larsen & Toubro Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "LT.NS" },
  { symbol: "AXISBANK", name: "Axis Bank Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "AXISBANK.NS" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "KOTAKBANK.NS" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "BAJFINANCE.NS" },
  { symbol: "MARUTI", name: "Maruti Suzuki India Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "MARUTI.NS" },
  { symbol: "WIPRO", name: "Wipro Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "WIPRO.NS" },
  { symbol: "HCLTECH", name: "HCL Technologies Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "HCLTECH.NS" },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "SUNPHARMA.NS" },
  { symbol: "TATAMOTORS", name: "Tata Motors Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "TATAMOTORS.NS" },
  { symbol: "TATASTEEL", name: "Tata Steel Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "TATASTEEL.NS" },
  { symbol: "ASIANPAINT", name: "Asian Paints Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "ASIANPAINT.NS" },
  { symbol: "ADANIENT", name: "Adani Enterprises Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "ADANIENT.NS" },
  { symbol: "ADANIPORTS", name: "Adani Ports and SEZ Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "ADANIPORTS.NS" },
  { symbol: "POWERGRID", name: "Power Grid Corporation of India Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "POWERGRID.NS" },
  { symbol: "NTPC", name: "NTPC Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "NTPC.NS" },
  { symbol: "ONGC", name: "Oil & Natural Gas Corporation Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "ONGC.NS" },
  { symbol: "COALINDIA", name: "Coal India Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "COALINDIA.NS" },
  { symbol: "TECHM", name: "Tech Mahindra Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "TECHM.NS" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "ULTRACEMCO.NS" },
  { symbol: "NESTLEIND", name: "Nestle India Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "NESTLEIND.NS" },
  { symbol: "TITAN", name: "Titan Company Ltd", exchange: "NSE", instrumentType: "stock", yahooSymbol: "TITAN.NS" },
  { symbol: "NIFTYBEES", name: "Nippon India ETF Nifty BeES", exchange: "NSE", instrumentType: "etf", yahooSymbol: "NIFTYBEES.NS" },
  { symbol: "BANKBEES", name: "Nippon India ETF Bank BeES", exchange: "NSE", instrumentType: "etf", yahooSymbol: "BANKBEES.NS" },
  { symbol: "JUNIORBEES", name: "Nippon India ETF Junior BeES", exchange: "NSE", instrumentType: "etf", yahooSymbol: "JUNIORBEES.NS" },
  { symbol: "GOLDBEES", name: "Nippon India ETF Gold BeES", exchange: "NSE", instrumentType: "etf", yahooSymbol: "GOLDBEES.NS" },
  { symbol: "SILVERBEES", name: "Nippon India ETF Silver BeES", exchange: "NSE", instrumentType: "etf", yahooSymbol: "SILVERBEES.NS" },
  { symbol: "SETFNIF50", name: "SBI ETF Nifty 50", exchange: "NSE", instrumentType: "etf", yahooSymbol: "SETFNIF50.NS" },
  { symbol: "MON100", name: "Motilal Oswal Nasdaq 100 ETF", exchange: "NSE", instrumentType: "etf", yahooSymbol: "MON100.NS" },
  { symbol: "MAFANG", name: "Mirae Asset NYSE FANG+ ETF", exchange: "NSE", instrumentType: "etf", yahooSymbol: "MAFANG.NS" },
];

export function searchLocalSymbols(query: string, limit = 12): SearchResult[] {
  const q = query.trim().toUpperCase();
  if (q.length < 1) return [];

  const scored = INDIAN_SYMBOLS.map((item) => {
    const sym = item.symbol.toUpperCase();
    const name = item.name.toUpperCase();
    let score = 0;
    if (sym === q) score = 100;
    else if (sym.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 50;
    else if (sym.includes(q)) score = 40;
    return { item, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.item);
}
