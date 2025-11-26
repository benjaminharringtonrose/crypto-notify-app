export type CoinSymbol = "BTC" | "ETH" | "SUI" | "ADA" | "MONAD";

export type CoinData = {
  name: string;
  symbol: CoinSymbol;
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

class CoinGeckoService {
  coins: CoinConfig[] = COINS;

  async get24hChanges(): Promise<Record<CoinSymbol, CoinData>> {
    const ids = Object.values(COINGECKO_IDS).join(",");

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
        ids
      )}&vs_currencies=usd&include_24hr_change=true`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch market data (${response.status})`);
    }

    const json = (await response.json()) as Record<
      string,
      { usd?: number; usd_24h_change?: number }
    >;

    const data: Partial<Record<CoinSymbol, CoinData>> = {};

    (this.coins.map((c) => c.symbol) as CoinSymbol[]).forEach((symbol) => {
      const id = COINGECKO_IDS[symbol];
      const entry = json[id];

      data[symbol] = {
        name: this.coins.find((c) => c.symbol === symbol)?.label ?? symbol,
        symbol,
        usdPrice24hrPercentChange:
          typeof entry?.usd_24h_change === "number"
            ? entry.usd_24h_change
            : null,
      };
    });

    return data as Record<CoinSymbol, CoinData>;
  }
}

export const coinGeckoService = new CoinGeckoService();
