import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors } from "@/theme/colors";
import { TIME_RANGES, TimeRangeKey } from "@/services/CoinGeckoService";
import {
  useGetMonadSmartDistributionQuery,
  WalletBalanceSummary,
} from "@/store/smartApi";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function SmartFlows() {
  const { top } = useSafeAreaInsets();

  const [timeRange, setTimeRange] = React.useState<TimeRangeKey>("1h");

  const { data, isFetching, isError } = useGetMonadSmartDistributionQuery(
    { timeRange },
    {
      refetchOnMountOrArgChange: 60 * 60,
    }
  );

  const smartMoney = data?.cohorts.smartMoney;
  const smartTraders = data?.cohorts.smartTraders;

  const selectedRangeLabel =
    TIME_RANGES.find((r) => r.key === timeRange)?.label ?? "";

  const renderCohort = (
    label: string,
    cohort?: {
      wallets: WalletBalanceSummary[];
      averagePercentChange: number | null;
    }
  ) => {
    const wallets = cohort?.wallets ?? [];
    const avgPct =
      typeof cohort?.averagePercentChange === "number"
        ? cohort.averagePercentChange
        : null;

    const avgColor =
      typeof avgPct === "number"
        ? avgPct >= 0
          ? colors.success.text
          : colors.danger.text
        : colors.text.secondary;

    return (
      <View style={styles.cohortCard}>
        <View style={styles.cohortHeaderRow}>
          <Text style={styles.cohortTitle}>{label}</Text>
          <Text style={[styles.cohortAvg, { color: avgColor }]}>
            {avgPct !== null ? `${avgPct.toFixed(2)}% avg` : "--"}
          </Text>
        </View>
        {wallets.length === 0 ? (
          <Text style={styles.metricLabel}>
            No wallets found for this cohort.
          </Text>
        ) : (
          wallets.map((wallet) => {
            const pct = wallet.percentChange;
            const pctText =
              typeof pct === "number" ? `${pct.toFixed(2)}%` : "--";
            const pctColor =
              typeof pct === "number"
                ? pct >= 0
                  ? colors.success.text
                  : colors.danger.text
                : colors.text.secondary;

            return (
              <View key={wallet.address} style={styles.walletRow}>
                <View style={styles.walletColumn}>
                  <Text style={styles.walletAddress}>
                    {wallet.address.slice(0, 6)}...
                    {wallet.address.slice(-4)}
                  </Text>
                  <Text style={styles.walletLabel}>
                    Current balance (end of {selectedRangeLabel})
                  </Text>
                </View>
                <View style={styles.walletColumnRight}>
                  <Text style={styles.walletBalance}>{wallet.endMon} MON</Text>
                  <Text style={[styles.walletDelta, { color: pctColor }]}>
                    {pctText} over {selectedRangeLabel}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Monad Smart Flows</Text>
          <Text style={styles.subtitle}>
            Native MON balances for Smart Money and Smart Traders.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rangeRow}
        >
          {TIME_RANGES.map((range) => {
            const isSelected = range.key === timeRange;
            return (
              <View
                key={range.key}
                style={[styles.rangePill, isSelected && styles.rangePillActive]}
              >
                <Text
                  onPress={() => setTimeRange(range.key)}
                  style={[
                    styles.rangeLabel,
                    isSelected && styles.rangeLabelActive,
                  ]}
                >
                  {range.label}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {isFetching ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Fetching smart flow data…</Text>
          </View>
        ) : isError ? (
          <Text style={styles.errorText}>
            Failed to load smart flow distribution.
          </Text>
        ) : (
          <>
            {renderCohort("Smart Money", smartMoney)}
            {renderCohort("Smart Traders", smartTraders)}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: colors.text.secondary,
  },
  rangeRow: {
    marginBottom: 24,
  },
  rangePill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginRight: 8,
  },
  rangePillActive: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.accent,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text.secondary,
  },
  rangeLabelActive: {
    color: colors.text.white,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  errorText: {
    color: colors.error.text,
    fontSize: 14,
  },
  cohortCard: {
    backgroundColor: colors.background.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.dark,
    marginBottom: 16,
  },
  cohortTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 12,
  },
  cohortHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cohortAvg: {
    fontSize: 13,
    fontWeight: "600",
  },
  metricLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  walletRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
  },
  walletColumn: {
    flex: 2,
  },
  walletColumnRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  walletAddress: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text.primary,
  },
  walletLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  walletBalance: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
  },
  walletDelta: {
    fontSize: 12,
    marginTop: 2,
  },
});
