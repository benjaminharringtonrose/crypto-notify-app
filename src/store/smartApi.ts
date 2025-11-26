import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import Constants from "expo-constants";

import { TimeRangeKey } from "@/services/CoinGeckoService";

export type WalletBalanceSummary = {
  address: string;
  startMon: string;
  endMon: string;
  deltaMon: string;
  percentChange: number | null;
};

export type CohortBalances = {
  wallets: WalletBalanceSummary[];
  averagePercentChange: number | null;
};

export type SmartDistributionResponse = {
  coin: string;
  timeRange: TimeRangeKey;
  cohorts: {
    smartMoney: CohortBalances;
    smartTraders: CohortBalances;
  };
  source: string;
};

const defaultBaseUrl = "http://192.168.1.2:4000";

export const smartApi = createApi({
  reducerPath: "smartApi",
  baseQuery: fetchBaseQuery({
    baseUrl:
      (Constants.expoConfig?.extra as { BACKEND_URL?: string } | undefined)
        ?.BACKEND_URL ?? defaultBaseUrl,
  }),
  tagTypes: ["SmartDistribution"],
  endpoints: (builder) => ({
    getMonadSmartDistribution: builder.query<
      SmartDistributionResponse,
      { timeRange: TimeRangeKey }
    >({
      query: ({ timeRange }) => ({
        url: "/api/monad/smart-distribution",
        params: { timeRange },
      }),
      providesTags: (result) =>
        result
          ? [
              {
                type: "SmartDistribution",
                id: `${result.coin}-${result.timeRange}`,
              },
            ]
          : [],
      // Keep data cached for 5 hours to avoid refetching too often.
      // keepUnusedDataFor: 5 * 60 * 60,
    }),
  }),
});

export const { useGetMonadSmartDistributionQuery } = smartApi;
