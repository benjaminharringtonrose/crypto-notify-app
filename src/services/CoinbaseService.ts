import type {
  CoinSymbol,
  CoinData,
  CoinConfig,
} from "@/services/CoinGeckoService";
import Constants from "expo-constants";
import CryptoJS from "crypto-js";

// Reuse the same coins the UI already knows about
const COINS: CoinConfig[] = [
  { symbol: "BTC", label: "Bitcoin" },
  { symbol: "ETH", label: "Ethereum" },
  { symbol: "SUI", label: "Sui" },
  { symbol: "ADA", label: "Cardano" },
  { symbol: "MONAD", label: "Monad" },
];

// Map symbols to Coinbase Advanced Trade product IDs.
// NOTE: Ensure these products exist on Coinbase; if any are missing,
// they will simply return no data and show "--" in the UI.
const COINBASE_PRODUCTS: Partial<Record<CoinSymbol, string>> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SUI: "SUI-USD",
  ADA: "ADA-USD",
  MONAD: "MONAD-USD",
};

type CoinbaseProduct = {
  product_id: string;
  price_percentage_change_24h?: string;
};

type CoinbaseProductsResponse = {
  products?: CoinbaseProduct[];
};

class CoinbaseService {
  coins: CoinConfig[] = COINS;

  private get apiKey() {
    return Constants.expoConfig?.extra?.COINBASE_API_KEY;
  }

  private get apiSecret() {
    return Constants.expoConfig?.extra?.COINBASE_API_SECRET;
  }

  private get apiPassphrase() {
    return Constants.expoConfig?.extra?.COINBASE_API_PASSPHRASE;
  }

  private signRequest(method: string, pathWithQuery: string, body: string) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const prehash = timestamp + method.toUpperCase() + pathWithQuery + body;
    const secret = this.apiSecret ?? "";

    // Per Coinbase docs, the secret is base64‑decoded before being used as the HMAC key.
    const key = CryptoJS.enc.Base64.parse(secret);
    const hmac = CryptoJS.HmacSHA256(prehash, key);
    const signature = CryptoJS.enc.Base64.stringify(hmac);

    return { timestamp, signature };
  }

  /**
   * Fetch 24h percentage changes for configured products using Coinbase
   * Advanced Trade products endpoint with API key/secret auth:
   *
   * GET https://api.coinbase.com/api/v3/brokerage/products?product_ids=BTC-USD,ETH-USD,...
   */
  async get24hChanges(): Promise<Record<CoinSymbol, CoinData>> {
    if (!this.apiKey || !this.apiSecret || !this.apiPassphrase) {
      throw new Error(
        "Missing COINBASE_API_KEY, COINBASE_API_SECRET, or COINBASE_API_PASSPHRASE in expo config."
      );
    }
    const productIds = this.coins
      .map((coin) => COINBASE_PRODUCTS[coin.symbol])
      .filter(Boolean) as string[];

    if (productIds.length === 0) {
      return {} as Record<CoinSymbol, CoinData>;
    }

    const query = `product_ids=${encodeURIComponent(productIds.join(","))}`;
    const path = `/api/v3/brokerage/products?${query}`;
    const url = `https://api.coinbase.com${path}`;

    const { timestamp, signature } = this.signRequest("GET", path, "");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "CB-ACCESS-KEY": this.apiKey,
        "CB-ACCESS-SIGN": signature,
        "CB-ACCESS-TIMESTAMP": timestamp,
        "CB-ACCESS-PASSPHRASE": this.apiPassphrase,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Coinbase prices (${response.status})`);
    }

    const json = (await response.json()) as CoinbaseProductsResponse;
    const byId = new Map<string, CoinbaseProduct>();
    (json.products ?? []).forEach((p) => {
      byId.set(p.product_id, p);
    });

    const data: Partial<Record<CoinSymbol, CoinData>> = {};

    this.coins.forEach((coin) => {
      const productId = COINBASE_PRODUCTS[coin.symbol];
      const product = productId ? byId.get(productId) : undefined;

      const rawChange = product?.price_percentage_change_24h;
      const parsedChange =
        typeof rawChange === "string" ? Number.parseFloat(rawChange) : NaN;

      data[coin.symbol] = {
        name: coin.label,
        symbol: coin.symbol,
        usdPrice24hrPercentChange: Number.isFinite(parsedChange)
          ? parsedChange
          : null,
      };
    });

    return data as Record<CoinSymbol, CoinData>;
  }
}

export const coinbaseService = new CoinbaseService();
