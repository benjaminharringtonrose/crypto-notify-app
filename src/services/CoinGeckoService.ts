export type CoinSymbol = "BTC" | "ETH" | "SUI" | "ADA" | "MONAD";

export type TimeRangeKey =
  | "1h"
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
    { key: "1h", label: "1 hr", days: 1 / 24 }, // 1 hour
    { key: "24h", label: "24 hrs", days: 1 },
    { key: "3d", label: "3 days", days: 3 },
    { key: "1w", label: "1 week", days: 7 },
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

  /**
   * Get detailed coin information including price, market cap, volume, ATH, etc.
   * Uses the CoinGecko `/coins/{id}` endpoint.
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
  } | null> {
    const id = COINGECKO_IDS[symbol];

    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch coin details (${response.status})`);
    }

    const json = (await response.json()) as {
      market_data?: {
        current_price?: { usd?: number };
        market_cap?: { usd?: number };
        circulating_supply?: number;
        total_supply?: number;
        total_volume?: { usd?: number };
        market_cap_rank?: number;
        ath?: { usd?: number };
        ath_date?: { usd?: string };
        price_change_percentage_24h?: number;
        price_change_percentage_7d?: number;
        price_change_percentage_30d?: number;
      };
    };

    const marketData = json.market_data;
    if (!marketData) return null;

    return {
      currentPrice: marketData.current_price?.usd ?? null,
      marketCap: marketData.market_cap?.usd ?? null,
      circulatingSupply: marketData.circulating_supply ?? null,
      totalSupply: marketData.total_supply ?? null,
      volume24h: marketData.total_volume?.usd ?? null,
      marketCapRank: marketData.market_cap_rank ?? null,
      ath: marketData.ath?.usd ?? null,
      athDate: marketData.ath_date?.usd ?? null,
      priceChange24h: marketData.price_change_percentage_24h ?? null,
      priceChange7d: marketData.price_change_percentage_7d ?? null,
      priceChange30d: marketData.price_change_percentage_30d ?? null,
    };
  }

  /**
   * Get total global cryptocurrency market cap for dominance calculations.
   */
  async getGlobalMarketCap(): Promise<number | null> {
    const response = await fetch(`https://api.coingecko.com/api/v3/global`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch global market data (${response.status})`
      );
    }

    const json = (await response.json()) as {
      data?: {
        total_market_cap?: { usd?: number };
      };
    };

    return json.data?.total_market_cap?.usd ?? null;
  }
}

export const coinGeckoService = new CoinGeckoService();
