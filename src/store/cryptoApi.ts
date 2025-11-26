import { createApi } from "@reduxjs/toolkit/query/react";

import { CoinSymbol, TimeRangeKey } from "@/services/CoinGeckoService";
import { cryptoService, PercentChangeResult } from "@/services/CryptoService";

export type CoinDetailsResult = {
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
};

export const cryptoApi = createApi({
  reducerPath: "cryptoApi",
  // We don't use a real HTTP baseQuery here; we delegate to CryptoService
  // inside queryFn instead.
  baseQuery: async () => ({ data: null as unknown }),
  tagTypes: ["PercentChange", "CoinDetails"],
  endpoints: (builder) => ({
    getPercentChange: builder.query<
      PercentChangeResult,
      { symbol: CoinSymbol; range: TimeRangeKey }
    >({
      async queryFn(arg) {
        try {
          const data = await cryptoService.getPercentChange(
            arg.symbol,
            arg.range
          );
          return { data };
        } catch (error) {
          return {
            error: {
              status: "CRYPTO_SERVICE_ERROR",
              error: (error as Error).message ?? String(error),
            } as unknown,
          };
        }
      },
      providesTags: (result, error, { symbol, range }) => [
        { type: "PercentChange", id: `${symbol}-${range}` },
      ],
      keepUnusedDataFor: 120,
    }),
    getCoinDetails: builder.query<CoinDetailsResult, { symbol: CoinSymbol }>({
      async queryFn(arg) {
        try {
          const data = await cryptoService.getCoinDetails(arg.symbol);
          return { data };
        } catch (error) {
          return {
            error: {
              status: "CRYPTO_SERVICE_ERROR",
              error: (error as Error).message ?? String(error),
            } as unknown,
          };
        }
      },
      providesTags: (result, error, { symbol }) => [
        { type: "CoinDetails", id: symbol },
      ],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),
    getGlobalMarketCap: builder.query<number | null, void>({
      async queryFn() {
        try {
          const data = await cryptoService.getGlobalMarketCap();
          return { data };
        } catch (error) {
          return {
            error: {
              status: "CRYPTO_SERVICE_ERROR",
              error: (error as Error).message ?? String(error),
            } as unknown,
          };
        }
      },
      providesTags: [{ type: "CoinDetails", id: "GLOBAL_MARKET_CAP" }],
      keepUnusedDataFor: 600, // Cache for 10 minutes
    }),
  }),
});

export const {
  useGetPercentChangeQuery,
  useGetCoinDetailsQuery,
  useGetGlobalMarketCapQuery,
} = cryptoApi;
