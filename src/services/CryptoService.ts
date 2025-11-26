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

  /**
   * Get detailed coin information. Tries CoinGecko first, falls back to CoinMarketCap.
   */
  async getCoinDetails(symbol: CoinSymbol): Promise<{
    currentPrice: number | null;
    marketCap: number | null;
    circulatingSupply: number | null;
    totalSupply: number | null;
    volume24h: number | null;
    marketCapRank: number | null;
    ath: number | null;
    athDate: string | null;
    priceChange24h: number | null;
    priceChange7d: number | null;
    priceChange30d: number | null;
    source: "coinmarketcap" | "coingecko" | "none";
  }> {
    // Try CoinGecko first (has ATH data)
    try {
      const geckoData = await coinGeckoService.getCoinDetails(symbol);
      if (geckoData) {
        return { ...geckoData, source: "coingecko" };
      }
    } catch (err) {
      console.warn(
        "CoinGeckoService failed for coin details, falling back to CoinMarketCap:",
        err
      );
    }

    // Fallback to CoinMarketCap
    try {
      const cmcData = await coinMarketCapService.getCoinDetails(symbol);
      if (cmcData) {
        return { ...cmcData, source: "coinmarketcap" };
      }
    } catch (err) {
      console.warn("CoinMarketCapService failed for coin details:", err);
    }

    return {
      currentPrice: null,
      marketCap: null,
      circulatingSupply: null,
      totalSupply: null,
      volume24h: null,
      marketCapRank: null,
      ath: null,
      athDate: null,
      priceChange24h: null,
      priceChange7d: null,
      priceChange30d: null,
      source: "none",
    };
  }

  /**
   * Get total global cryptocurrency market cap.
   */
  async getGlobalMarketCap(): Promise<number | null> {
    try {
      return await coinGeckoService.getGlobalMarketCap();
    } catch (err) {
      console.warn("Failed to fetch global market cap:", err);
      return null;
    }
  }
}

export const cryptoService = new CryptoService();
