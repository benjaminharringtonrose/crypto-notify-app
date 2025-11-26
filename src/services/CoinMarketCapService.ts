import Constants from "expo-constants";

import { CoinSymbol, TimeRangeKey } from "@/services/CoinGeckoService";

type CoinMarketCapQuote = {
  percent_change_24h?: number;
  percent_change_7d?: number;
  percent_change_30d?: number;
  percent_change_90d?: number;
  percent_change_180d?: number;
  percent_change_365d?: number;
};

const COINMARKETCAP_SYMBOLS: Record<CoinSymbol, string> = {
  BTC: "BTC",
  ETH: "ETH",
  SUI: "SUI",
  ADA: "ADA",
  MONAD: "MON",
};

const RANGE_TO_FIELD: Record<TimeRangeKey, keyof CoinMarketCapQuote> = {
  "24h": "percent_change_24h",
  "2d": "percent_change_7d",
  "3d": "percent_change_7d",
  "1w": "percent_change_7d",
  "2w": "percent_change_7d",
  "1m": "percent_change_30d",
  "3m": "percent_change_90d",
  "6m": "percent_change_180d",
  "1y": "percent_change_365d",
};

class CoinMarketCapService {
  private get apiKey() {
    return Constants.expoConfig?.extra?.COIN_MARKET_CAP_API_KEY;
  }

  /**
   * Get percentage price change over a given time range for a single coin
   * using CoinMarketCap `cryptocurrency/quotes/latest`.
   *
   * Note: CoinMarketCap exposes fixed windows (24h, 7d, 30d, 90d, 180d, 365d),
   * so some of the custom ranges are mapped to the nearest available window.
   */
  async getPercentChange(
    symbol: CoinSymbol,
    range: TimeRangeKey
  ): Promise<number | null> {
    if (!this.apiKey) {
      throw new Error(
        "Missing COIN_MARKET_CAP_API_KEY. Please add it to your expo config."
      );
    }

    const cmcSymbol = COINMARKETCAP_SYMBOLS[symbol];
    const field = RANGE_TO_FIELD[range];

    const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(
      cmcSymbol
    )}&convert=USD`;

    const response = await fetch(url, {
      headers: {
        "X-CMC_PRO_API_KEY": this.apiKey,
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch CoinMarketCap data (${response.status})`
      );
    }

    const json = (await response.json()) as {
      data?: {
        [symbol: string]: {
          quote?: {
            USD?: CoinMarketCapQuote;
          };
        }[];
      };
    };

    const entry = json.data?.[cmcSymbol]?.[0];
    const quote = entry?.quote?.USD;
    if (!quote) return null;

    const value = quote[field];
    return typeof value === "number" ? value : null;
  }
}

export const coinMarketCapService = new CoinMarketCapService();
