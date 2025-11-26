import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import Constants from "expo-constants";

import { TimeRangeKey } from "@/services/CoinGeckoService";

type CohortDistribution = {
  netInflowPercent: number;
  netOutflowPercent: number;
};

export type SmartDistributionResponse = {
  coin: string;
  timeRange: TimeRangeKey;
  cohorts: {
    smartMoney: CohortDistribution;
    smartTraders: CohortDistribution;
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
      keepUnusedDataFor: 120,
    }),
  }),
});

export const { useGetMonadSmartDistributionQuery } = smartApi;
