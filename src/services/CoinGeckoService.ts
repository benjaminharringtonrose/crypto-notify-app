export type CoinSymbol = "BTC" | "ETH" | "SUI" | "ADA" | "MONAD";

export type TimeRangeKey =
  | "24h"
  | "2d"
  | "3d"
  | "1w"
  | "2w"
  | "1m"
  | "3m"
  | "6m"
  | "1y";

export type CoinData = {
  name: string;
  symbol: CoinSymbol;
  // We reuse this field to hold the percent change for the currently
  // selected time range (not just 24h).
  usdPrice24hrPercentChange: number | null;
};

export type CoinConfig = {
  symbol: CoinSymbol;
  label: string;
};

const COINS: CoinConfig[] = [
  { symbol: "BTC", label: "Bitcoin" },
  { symbol: "ETH", label: "Ethereum" },
  { symbol: "SUI", label: "Sui" },
  { symbol: "ADA", label: "Cardano" },
  { symbol: "MONAD", label: "Monad" },
];

// Map our symbols to CoinGecko IDs
const COINGECKO_IDS: Record<CoinSymbol, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SUI: "sui",
  ADA: "cardano",
  MONAD: "monad",
};

export const TIME_RANGES: { key: TimeRangeKey; label: string; days: number }[] =
  [
    { key: "24h", label: "24 hrs", days: 1 },
    { key: "2d", label: "2 days", days: 2 },
    { key: "3d", label: "3 days", days: 3 },
    { key: "1w", label: "1 week", days: 7 },
    { key: "2w", label: "2 weeks", days: 14 },
    { key: "1m", label: "1 month", days: 30 },
    { key: "3m", label: "3 months", days: 90 },
    { key: "6m", label: "6 months", days: 180 },
    { key: "1y", label: "1 year", days: 365 },
  ];

class CoinGeckoService {
  coins: CoinConfig[] = COINS;
  /**
   * Get percentage price change over a given time range for a single coin.
   * Uses the CoinGecko `market_chart` endpoint and computes change between
   * the first and last price points.
   */
  async getPercentChange(
    symbol: CoinSymbol,
    range: TimeRangeKey
  ): Promise<number | null> {
    const id = COINGECKO_IDS[symbol];
    const rangeConfig = TIME_RANGES.find((r) => r.key === range);
    const days = rangeConfig?.days ?? 1;

    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch market data (${response.status})`);
    }

    const json = (await response.json()) as {
      prices?: [number, number][];
    };

    const prices = json.prices ?? [];
    if (prices.length < 2) {
      return null;
    }

    const first = prices[0][1];
    const last = prices[prices.length - 1][1];

    if (!first || first <= 0) {
      return null;
    }

    const change = ((last - first) / first) * 100;
    return Number.isFinite(change) ? change : null;
  }
}

export const coinGeckoService = new CoinGeckoService();
