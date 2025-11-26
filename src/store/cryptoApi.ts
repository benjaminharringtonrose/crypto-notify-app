import { createApi } from "@reduxjs/toolkit/query/react";

import { CoinSymbol, TimeRangeKey } from "@/services/CoinGeckoService";
import { cryptoService, PercentChangeResult } from "@/services/CryptoService";

export const cryptoApi = createApi({
  reducerPath: "cryptoApi",
  // We don't use a real HTTP baseQuery here; we delegate to CryptoService
  // inside queryFn instead.
  baseQuery: async () => ({ data: null as unknown }),
  tagTypes: ["PercentChange"],
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
  }),
});

export const { useGetPercentChangeQuery } = cryptoApi;
