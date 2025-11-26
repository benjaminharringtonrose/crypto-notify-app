import Constants from "expo-constants";

import type {
  CoinSymbol,
  CoinData,
  CoinConfig,
} from "@/services/CoinGeckoService";

// Reuse the same coins the UI already knows about
const COINS: CoinConfig[] = [
  { symbol: "BTC", label: "Bitcoin" },
  { symbol: "ETH", label: "Ethereum" },
  { symbol: "SUI", label: "Sui" },
  { symbol: "ADA", label: "Cardano" },
  { symbol: "MONAD", label: "Monad" },
];

// Map each symbol to an EVM token definition for Moralis.
// NOTE: You can adjust these addresses/chains as needed.
const MORALIS_TOKENS: Partial<
  Record<
    CoinSymbol,
    {
      address: string;
      chain: string;
    }
  >
> = {
  // Wrapped BTC on Ethereum mainnet
  BTC: {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    chain: "0x1",
  },
  // WETH on Ethereum mainnet
  ETH: {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    chain: "0x1",
  },
  // TODO: Fill in SUI / ADA / MONAD ERC‑20 equivalents if desired.
};

type MoralisPriceResponse = {
  // We only care about these fields from the Moralis response
  usdPrice?: number;
  usdPrice24hrPercentChange?: number;
};

type MoralisWalletHistoryResponse = {
  // We keep this intentionally loose – callers can shape it as needed.
  // See Moralis docs for the full schema.
  result?: unknown[];
  cursor?: string | null;
  page?: number;
  page_size?: number;
};

class MoralisService {
  coins: CoinConfig[] = COINS;

  private get apiKey() {
    return Constants.expoConfig?.extra?.MORALIS_API_KEY;
  }

  /**
   * Fetch 24h percent changes for the configured tokens using Moralis
   * `getTokenPrice` endpoint:
   *   GET https://deep-index.moralis.io/api/v2.2/erc20/:address/price?chain=...
   */
  async get24hChanges(): Promise<Record<CoinSymbol, CoinData>> {
    const apiKey = this.apiKey;

    if (!apiKey) {
      throw new Error(
        "Missing MORALIS_API_KEY. Please add it under expo.extra.MORALIS_API_KEY."
      );
    }

    const data: Partial<Record<CoinSymbol, CoinData>> = {};

    await Promise.all(
      this.coins.map(async (coin) => {
        const def = MORALIS_TOKENS[coin.symbol];
        if (!def) return;

        const url = `https://deep-index.moralis.io/api/v2.2/erc20/${
          def.address
        }/price?chain=${encodeURIComponent(def.chain)}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "X-API-Key": apiKey,
            accept: "application/json",
          },
        });

        if (!response.ok) {
          // If one token fails, skip it but don't break the whole screen
          console.warn(
            `Failed to fetch Moralis price for ${coin.symbol} (${response.status})`
          );
          return;
        }

        const raw = (await response.json()) as MoralisPriceResponse;

        data[coin.symbol] = {
          name: coin.label,
          symbol: coin.symbol,
          usdPrice24hrPercentChange:
            typeof raw.usdPrice24hrPercentChange === "number"
              ? raw.usdPrice24hrPercentChange
              : null,
        };
      })
    );

    return data as Record<CoinSymbol, CoinData>;
  }

  /**
   * Fetch multichain wallet activity for a given address using:
   *   GET /wallets/{address}/history
   *
   * Note: This only works for chains supported by Moralis (EVM chains).
   * Monad is not currently supported, so this is best used for EVM-based
   * activity of "smart" wallets.
   */
  async getWalletHistory(params: {
    address: string;
    chains?: string[]; // e.g. ["eth", "polygon"]
    cursor?: string;
    limit?: number;
  }): Promise<MoralisWalletHistoryResponse> {
    const apiKey = this.apiKey;

    if (!apiKey) {
      throw new Error(
        "Missing MORALIS_API_KEY. Please add it under expo.extra.MORALIS_API_KEY."
      );
    }

    const { address, chains, cursor, limit = 100 } = params;

    const searchParams = new URLSearchParams();
    searchParams.set("limit", String(limit));
    if (chains && chains.length > 0) {
      searchParams.set("chains", chains.join(","));
    }
    if (cursor) {
      searchParams.set("cursor", cursor);
    }

    const url = `https://deep-index.moralis.io/api/v2.2/wallets/${address}/history?${searchParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Moralis wallet history (${response.status})`
      );
    }

    const json = (await response.json()) as MoralisWalletHistoryResponse;
    return json;
  }
}

export const moralisService = new MoralisService();
