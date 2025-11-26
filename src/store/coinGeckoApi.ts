import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import {
  CoinSymbol,
  TimeRangeKey,
  TIME_RANGES,
} from "@/services/CoinGeckoService";

type MarketChartResponse = {
  prices?: [number, number][];
};

const COINGECKO_IDS: Record<CoinSymbol, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SUI: "sui",
  ADA: "cardano",
  MONAD: "monad",
};

export const coinGeckoApi = createApi({
  reducerPath: "coinGeckoApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "https://api.coingecko.com/api/v3",
  }),
  tagTypes: ["PercentChange"],
  endpoints: (builder) => ({
    getPercentChange: builder.query<
      number | null,
      { symbol: CoinSymbol; range: TimeRangeKey }
    >({
      query: ({ symbol, range }) => {
        const id = COINGECKO_IDS[symbol];
        const rangeConfig = TIME_RANGES.find((r) => r.key === range);
        const days = rangeConfig?.days ?? 1;

        return `/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
      },
      transformResponse: (response: MarketChartResponse) => {
        const prices = response.prices ?? [];
        if (prices.length < 2) return null;

        const first = prices[0][1];
        const last = prices[prices.length - 1][1];
        if (!first || first <= 0) return null;

        const change = ((last - first) / first) * 100;
        return Number.isFinite(change) ? change : null;
      },
      providesTags: (result, error, { symbol, range }) => [
        { type: "PercentChange", id: `${symbol}-${range}` },
      ],
      keepUnusedDataFor: 60, // seconds to keep cached data
    }),
    // Example mutation that could force-refresh all cached percent changes
    refreshPercentChanges: builder.mutation<void, void>({
      queryFn: async () => ({ data: undefined }),
      invalidatesTags: () => [{ type: "PercentChange" }],
    }),
  }),
});

export const { useGetPercentChangeQuery, useRefreshPercentChangesMutation } =
  coinGeckoApi;
