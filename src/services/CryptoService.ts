import {
  CoinSymbol,
  TimeRangeKey,
  coinGeckoService,
} from "@/services/CoinGeckoService";
import { coinMarketCapService } from "@/services/CoinMarketCapService";

export type PercentChangeResult = {
  value: number | null;
  source: "coinmarketcap" | "coingecko" | "none";
};

class CryptoService {
  /**
   * Try CoinMarketCap first; if it fails or returns null, fall back to
   * CoinGecko. Returns a unified shape indicating which source was used.
   */
  async getPercentChange(
    symbol: CoinSymbol,
    range: TimeRangeKey
  ): Promise<PercentChangeResult> {
    // First: CoinMarketCap
    try {
      const cmcValue = await coinMarketCapService.getPercentChange(
        symbol,
        range
      );
      if (typeof cmcValue === "number") {
        return { value: cmcValue, source: "coinmarketcap" };
      }
    } catch (err) {
      console.warn(
        "CoinMarketCapService failed, falling back to CoinGecko:",
        err
      );
    }

    // Fallback: CoinGecko
    try {
      const geckoValue = await coinGeckoService.getPercentChange(symbol, range);
      if (typeof geckoValue === "number") {
        return { value: geckoValue, source: "coingecko" };
      }
    } catch (err) {
      console.warn(
        "CoinGeckoService failed while resolving CryptoService:",
        err
      );
    }

    return { value: null, source: "none" };
  }
}

export const cryptoService = new CryptoService();
