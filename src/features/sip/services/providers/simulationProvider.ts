import { getStock } from "../../../../services/stockService";
import { getMutualFund } from "../../../../services/mutualFundService";
import { getCrypto } from "../../../../services/cryptoService";
import { parseCryptoCoinId, parseMfSchemeCode } from "../../../../types/market";
import type { InvestmentProvider, PriceRequest } from "./types";
import type { PriceQuote } from "../../types";

export class SimulationProvider implements InvestmentProvider {
  readonly id = "simulation";

  async getPrice(request: PriceRequest): Promise<PriceQuote> {
    switch (request.assetType) {
      case "stock":
      case "etf": {
        const quote = await getStock(request.quoteKey || request.symbol);
        return {
          price: quote.price,
          name: quote.name,
          currency: quote.currency || "INR",
          asOf: quote.marketTime,
        };
      }
      case "mutual_fund": {
        const code =
          parseMfSchemeCode(request.quoteKey) ||
          parseMfSchemeCode(request.symbol) ||
          request.symbol;
        const fund = await getMutualFund(code);
        return {
          price: fund.nav,
          name: fund.schemeName,
          currency: fund.currency || "INR",
          asOf: fund.date,
        };
      }
      case "crypto": {
        const coinId =
          parseCryptoCoinId(request.quoteKey) ||
          parseCryptoCoinId(request.symbol) ||
          request.symbol;
        const coin = await getCrypto(coinId);
        return {
          price: coin.price,
          name: coin.name,
          currency: coin.currency || "INR",
          asOf: coin.lastUpdated,
        };
      }
      default:
        throw new Error(`Unsupported asset type: ${request.assetType}`);
    }
  }
}
