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
import { useGetMonadSmartDistributionQuery } from "@/store/smartApi";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function SmartFlows() {
  const { top } = useSafeAreaInsets();

  const [timeRange, setTimeRange] = React.useState<TimeRangeKey>("24h");

  const { data, isFetching, isError } = useGetMonadSmartDistributionQuery({
    timeRange,
  });

  const smartMoney = data?.cohorts.smartMoney;
  const smartTraders = data?.cohorts.smartTraders;

  const renderCohort = (label: string, values?: typeof smartMoney) => {
    const inflow =
      typeof values?.netInflowPercent === "number"
        ? `${values.netInflowPercent.toFixed(2)}%`
        : "--";
    const outflow =
      typeof values?.netOutflowPercent === "number"
        ? `${values.netOutflowPercent.toFixed(2)}%`
        : "--";

    return (
      <View style={styles.cohortCard}>
        <Text style={styles.cohortTitle}>{label}</Text>
        <View style={styles.cohortRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Avg Inflow</Text>
            <Text style={[styles.metricValue, { color: colors.success.text }]}>
              {inflow}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Avg Outflow</Text>
            <Text style={[styles.metricValue, { color: colors.danger.text }]}>
              {outflow}
            </Text>
          </View>
        </View>
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
            Average inflow and outflow for Smart Money and Smart Traders.
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
  cohortRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700",
  },
});
