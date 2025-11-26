import React, { useMemo, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { colors } from "@/theme/colors";
import {
  CoinSymbol,
  TIME_RANGES,
  TimeRangeKey,
} from "@/services/CoinGeckoService";
import {
  useGetPercentChangeQuery,
  useGetCoinDetailsQuery,
  useGetGlobalMarketCapQuery,
} from "@/store/cryptoApi";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function Home() {
  const { top } = useSafeAreaInsets();

  const [selected, setSelected] = useState<CoinSymbol>("BTC");
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("24h");
  const [error, setError] = useState<string | null>(null);
  const [infoModal, setInfoModal] = useState<string | null>(null);

  // Primary selected range change (driven by the range selector)
  const {
    data: primaryChangeResult,
    isFetching: isPrimaryFetching,
    isError: isPrimaryError,
  } = useGetPercentChangeQuery({ symbol: selected, range: timeRange });

  // Short, medium and longer‑term views on the selected coin
  const {
    data: oneHourResult,
    isFetching: is1hFetching,
    isError: is1hError,
  } = useGetPercentChangeQuery({ symbol: selected, range: "1h" });

  const {
    data: oneDayResult,
    isFetching: is24hFetching,
    isError: is24hError,
  } = useGetPercentChangeQuery({ symbol: selected, range: "24h" });

  const {
    data: oneWeekResult,
    isFetching: is1wFetching,
    isError: is1wError,
  } = useGetPercentChangeQuery({ symbol: selected, range: "1w" });

  // Key market movers snapshot (24h view)
  const { data: btc24h } = useGetPercentChangeQuery({
    symbol: "BTC",
    range: "24h",
  });
  const { data: eth24h } = useGetPercentChangeQuery({
    symbol: "ETH",
    range: "24h",
  });
  const { data: monad24h } = useGetPercentChangeQuery({
    symbol: "MONAD",
    range: "24h",
  });

  const { data: sui24h } = useGetPercentChangeQuery({
    symbol: "SUI",
    range: "24h",
  });
  const { data: ada24h } = useGetPercentChangeQuery({
    symbol: "ADA",
    range: "24h",
  });

  // BTC short and long views for dominance / context
  // These could be used later for more granular BTC trend context if desired.
  // For now we rely primarily on 24h moves for cross‑market comparisons.

  // Detailed coin information
  const {
    data: coinDetails,
    isFetching: isCoinDetailsFetching,
    isError: isCoinDetailsError,
  } = useGetCoinDetailsQuery({ symbol: selected });

  // Global market cap for dominance calculation
  const { data: globalMarketCap } = useGetGlobalMarketCapQuery();

  useEffect(() => {
    if (isPrimaryError || is1hError || is24hError || is1wError) {
      setError("Failed to load market data.");
    } else {
      setError(null);
    }
  }, [isPrimaryError, is1hError, is24hError, is1wError]);

  const primaryChange = primaryChangeResult?.value ?? null;
  const primaryIsPositive =
    typeof primaryChange === "number" && primaryChange > 0;
  const primaryIsNegative =
    typeof primaryChange === "number" && primaryChange < 0;

  const primaryChangeColor = primaryIsPositive
    ? colors.success.text
    : primaryIsNegative
    ? colors.danger.text
    : colors.text.secondary;

  const formatPct = (value: number | null | undefined) =>
    typeof value === "number" ? `${value.toFixed(2)}%` : "--";

  const formatCurrency = (value: number | null | undefined) => {
    if (typeof value !== "number") return "--";
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatLargeNumber = (value: number | null | undefined) => {
    if (typeof value !== "number") return "--";
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toLocaleString();
  };

  const formatPrice = (value: number | null | undefined) => {
    if (typeof value !== "number") return "--";
    if (value >= 1000)
      return `$${value.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })}`;
    if (value >= 1) return `$${value.toFixed(2)}`;
    if (value >= 0.01) return `$${value.toFixed(4)}`;
    return `$${value.toFixed(8)}`;
  };

  // Calculate dominance and % from ATH
  const dominance = useMemo(() => {
    if (
      typeof coinDetails?.marketCap !== "number" ||
      typeof globalMarketCap !== "number" ||
      globalMarketCap === 0
    ) {
      return null;
    }
    return (coinDetails.marketCap / globalMarketCap) * 100;
  }, [coinDetails?.marketCap, globalMarketCap]);

  const percentFromAth = useMemo(() => {
    if (
      typeof coinDetails?.currentPrice !== "number" ||
      typeof coinDetails?.ath !== "number" ||
      coinDetails.ath === 0
    ) {
      return null;
    }
    return (
      ((coinDetails.currentPrice - coinDetails.ath) / coinDetails.ath) * 100
    );
  }, [coinDetails?.currentPrice, coinDetails?.ath]);

  const oneHourChange = oneHourResult?.value ?? null;
  const oneDayChange = oneDayResult?.value ?? null;
  const oneWeekChange = oneWeekResult?.value ?? null;

  const decisionBias = useMemo(() => {
    const short = typeof oneHourChange === "number" ? oneHourChange : null;
    const medium = typeof oneDayChange === "number" ? oneDayChange : null;
    const long = typeof oneWeekChange === "number" ? oneWeekChange : null;

    const positives = [short, medium, long].filter(
      (v) => typeof v === "number" && (v as number) > 1
    ).length;
    const negatives = [short, medium, long].filter(
      (v) => typeof v === "number" && (v as number) < -1
    ).length;

    if (positives >= 2 && negatives === 0) return "Strong Buy Bias";
    if (positives >= 2 && negatives <= 1) return "Buy Bias";
    if (negatives >= 2 && positives === 0) return "Strong Sell Bias";
    if (negatives >= 2 && positives <= 1) return "Sell Bias";
    return "Wait / Re‑check";
  }, [oneHourChange, oneDayChange, oneWeekChange]);

  const decisionBiasColor = useMemo(() => {
    if (decisionBias.startsWith("Strong Buy") || decisionBias.startsWith("Buy"))
      return colors.success.text;
    if (
      decisionBias.startsWith("Strong Sell") ||
      decisionBias.startsWith("Sell")
    )
      return colors.danger.text;
    return colors.text.secondary;
  }, [decisionBias]);

  // --- Derived technical indicators (approximations from existing data) ---

  const volatilityLabel = useMemo(() => {
    const values = [oneHourChange, oneDayChange, oneWeekChange].filter(
      (v) => typeof v === "number"
    ) as number[];
    if (!values.length) return "Unknown";
    const maxAbs = Math.max(...values.map((v) => Math.abs(v)));
    if (maxAbs < 1.5) return "Low";
    if (maxAbs < 4) return "Medium";
    return "High";
  }, [oneHourChange, oneDayChange, oneWeekChange]);

  const trendConsistencyLabel = useMemo(() => {
    const values = [oneHourChange, oneDayChange, oneWeekChange];
    const positives = values.filter(
      (v) => typeof v === "number" && (v as number) > 0.5
    ).length;
    const negatives = values.filter(
      (v) => typeof v === "number" && (v as number) < -0.5
    ).length;

    if (positives === 3) return "Strong uptrend";
    if (negatives === 3) return "Strong downtrend";
    if (positives >= 2 && negatives === 0) return "Moderate uptrend";
    if (negatives >= 2 && positives === 0) return "Moderate downtrend";
    return "Choppy / mixed";
  }, [oneHourChange, oneDayChange, oneWeekChange]);

  const momentumLabel = useMemo(() => {
    if (typeof oneHourChange !== "number" || typeof oneDayChange !== "number")
      return "Unknown";

    const sameDirection = oneHourChange * oneDayChange > 0;
    const ratio =
      Math.abs(oneDayChange) > 0
        ? Math.abs(oneHourChange) / Math.abs(oneDayChange)
        : Infinity;

    if (sameDirection && ratio > 1.5)
      return oneHourChange > 0
        ? "Momentum accelerating up"
        : "Momentum accelerating down";
    if (!sameDirection) return "Momentum reversing";
    if (ratio < 0.7) return "Momentum cooling";
    return "Momentum steady";
  }, [oneHourChange, oneDayChange]);

  const pullbackLabel = useMemo(() => {
    if (typeof oneWeekChange !== "number" || typeof oneDayChange !== "number") {
      return "Unknown";
    }

    // Approximate: pullback within an uptrend when weekly is up but 24h is down
    if (oneWeekChange > 3 && oneDayChange < -1) {
      const size = Math.abs(oneDayChange);
      if (size > 8) return "Deep pullback within uptrend";
      if (size > 4) return "Healthy pullback within uptrend";
      return "Minor dip within uptrend";
    }

    if (oneWeekChange < -3 && oneDayChange > 1) {
      return "Bounce attempt within broader downtrend";
    }

    return "No clear pullback pattern";
  }, [oneWeekChange, oneDayChange]);

  const relativeStrengthLabel = useMemo(() => {
    const coin = oneDayChange;
    const btc = btc24h?.value ?? null;
    if (
      selected === "BTC" ||
      typeof coin !== "number" ||
      typeof btc !== "number"
    )
      return "N/A vs BTC";

    const diff = coin - btc;
    if (diff > 5) return "Strongly outperforming BTC";
    if (diff > 2) return "Outperforming BTC";
    if (diff < -5) return "Strongly underperforming BTC";
    if (diff < -2) return "Underperforming BTC";
    return "Moving roughly with BTC";
  }, [oneDayChange, btc24h, selected]);

  const marketBreadthLabel = useMemo(() => {
    const vals = [
      btc24h?.value,
      eth24h?.value,
      sui24h?.value,
      ada24h?.value,
      monad24h?.value,
    ].filter((v) => typeof v === "number") as number[];
    if (!vals.length) return "Unknown";
    const green = vals.filter((v) => v > 0).length;
    const ratio = green / vals.length;
    const pct = Math.round(ratio * 100);
    return `${pct}% of tracked majors green`;
  }, [btc24h, eth24h, sui24h, ada24h, monad24h]);

  const btcDominanceLabel = useMemo(() => {
    const btc = btc24h?.value;
    const eth = eth24h?.value;
    const sui = sui24h?.value;
    const ada = ada24h?.value;
    const mon = monad24h?.value;

    const alts = [eth, sui, ada, mon].filter(
      (v) => typeof v === "number"
    ) as number[];
    if (typeof btc !== "number" || !alts.length) return "Unknown";

    const avgAlts = alts.reduce((sum, v) => sum + v, 0) / (alts.length || 1);
    const diff = btc - avgAlts;

    if (diff > 3) return "BTC dominance likely rising";
    if (diff < -3) return "Alts likely gaining dominance";
    return "Dominance roughly stable";
  }, [btc24h, eth24h, sui24h, ada24h, monad24h]);

  const riskLabel = useMemo(() => {
    // Simple synthesis of volatility + breadth + trend
    const volScore =
      volatilityLabel === "High" ? 2 : volatilityLabel === "Medium" ? 1 : 0;

    let breadthScore = 1; // neutral
    const vals = [
      btc24h?.value,
      eth24h?.value,
      sui24h?.value,
      ada24h?.value,
      monad24h?.value,
    ].filter((v) => typeof v === "number") as number[];
    if (vals.length) {
      const green = vals.filter((v) => v > 0).length;
      const ratio = green / vals.length;
      if (ratio > 0.7) breadthScore = 0; // easier conditions
      else if (ratio < 0.3) breadthScore = 2; // tough market
    }

    const trendScore = trendConsistencyLabel.includes("Strong")
      ? 0
      : trendConsistencyLabel.includes("Moderate")
      ? 1
      : 2;

    const total = volScore + breadthScore + trendScore;

    if (total <= 1)
      return "Low risk environment – ok to size up (with caution)";
    if (total <= 3) return "Medium risk – moderate position sizing";
    return "High risk – size small or wait for clearer conditions";
  }, [
    volatilityLabel,
    btc24h,
    eth24h,
    sui24h,
    ada24h,
    monad24h,
    trendConsistencyLabel,
  ]);

  const isAnySelectedMetricLoading =
    isPrimaryFetching || is1hFetching || is24hFetching || is1wFetching;

  const infoExplanations: Record<string, { title: string; content: string }> = {
    "decision-snapshot": {
      title: "Decision Snapshot",
      content:
        "This combines price changes across three timeframes (1 hour, 24 hours, and 1 week) to give you a quick bias signal.\n\n" +
        "• Strong Buy/Sell: At least 2 timeframes show clear moves (>1% or <-1%) in the same direction\n" +
        "• Buy/Sell: 2 timeframes align, but with some mixed signals\n" +
        "• Wait/Re-check: Timeframes are conflicting or moves are too small\n\n" +
        "Use this as a starting point, but always consider the broader market context and your risk tolerance.",
    },
    volatility: {
      title: "Volatility",
      content:
        "Volatility measures how much the price has swung across different timeframes (1h, 24h, 1w).\n\n" +
        "• Low: Price moves are relatively calm and predictable\n" +
        "• Medium: Moderate price swings, normal market conditions\n" +
        "• High: Large price swings, more unpredictable moves\n\n" +
        "High volatility can mean bigger opportunities but also bigger risks. Consider sizing your positions accordingly.",
    },
    "trend-consistency": {
      title: "Trend Consistency",
      content:
        "This shows how consistently the price is moving in one direction across timeframes.\n\n" +
        "• Strong uptrend/downtrend: All timeframes (1h, 24h, 1w) are clearly aligned\n" +
        "• Moderate trend: Most timeframes align, but with some noise\n" +
        "• Choppy/mixed: Timeframes are conflicting, no clear direction\n\n" +
        "Strong trends are easier to trade, while choppy markets require more caution and patience.",
    },
    momentum: {
      title: "Momentum",
      content:
        "Momentum compares short-term (1h) moves against medium-term (24h) moves to see if price action is accelerating, cooling, or reversing.\n\n" +
        "• Accelerating: 1h move is much larger than 24h, same direction - strong momentum\n" +
        "• Cooling: 1h move is smaller than 24h - momentum may be fading\n" +
        "• Reversing: 1h and 24h moves are in opposite directions - potential trend change\n\n" +
        "Accelerating momentum can signal strong moves, but beware of exhaustion. Reversals may offer entry/exit opportunities.",
    },
    pullback: {
      title: "Pullback",
      content:
        "Pullback analysis compares recent moves (24h) against longer-term trends (1 week) to identify if you're buying a dip or chasing a top.\n\n" +
        "• Deep/Healthy pullback within uptrend: Weekly is up, but 24h is down - potential buying opportunity\n" +
        "• Bounce attempt within downtrend: Weekly is down, but 24h is up - be cautious, may be temporary\n" +
        "• No clear pattern: Moves are aligned or too small to form a pattern\n\n" +
        "Buying pullbacks in uptrends is generally safer than buying bounces in downtrends.",
    },
    "relative-strength": {
      title: "Relative Strength vs BTC",
      content:
        "This compares your selected coin's 24h performance against Bitcoin's 24h performance.\n\n" +
        "• Outperforming: Your coin is moving up more (or down less) than BTC\n" +
        "• Underperforming: Your coin is moving up less (or down more) than BTC\n" +
        "• Moving roughly with BTC: Similar performance\n\n" +
        "In bull markets, outperforming coins often continue to lead. In bear markets, underperformance can signal weakness. BTC is the market leader, so relative strength matters.",
    },
    "market-breadth": {
      title: "Market Breadth",
      content:
        "Market breadth shows what percentage of major coins (BTC, ETH, SUI, ADA, MONAD) are green (up) vs red (down) over 24 hours.\n\n" +
        "• High % green (>70%): Broad risk-on sentiment, market is generally healthy\n" +
        "• Low % green (<30%): Broad risk-off sentiment, market-wide selling\n" +
        "• Mixed (30-70%): Selective moves, not a clear market-wide trend\n\n" +
        "Strong breadth (most coins green) suggests a healthy market where individual coin moves are more likely to continue. Weak breadth suggests caution.",
    },
    "btc-dominance": {
      title: "BTC Dominance",
      content:
        "BTC dominance compares Bitcoin's 24h performance against the average performance of major altcoins (ETH, SUI, ADA, MONAD).\n\n" +
        "• BTC dominance rising: Bitcoin is outperforming alts - 'BTC season'\n" +
        "• Alts gaining dominance: Altcoins are outperforming BTC - 'alt season'\n" +
        "• Dominance stable: BTC and alts moving roughly together\n\n" +
        "BTC dominance trends can help you decide whether to focus on Bitcoin or altcoins. Rising dominance often means safer, more stable conditions. Falling dominance can mean more opportunity but also more risk in alts.",
    },
    risk: {
      title: "Risk Assessment",
      content:
        "This synthesizes volatility, market breadth, and trend consistency into a simple risk rating to guide your position sizing.\n\n" +
        "• Low risk: Low volatility, strong market breadth, clear trends - conditions are favorable\n" +
        "• Medium risk: Moderate volatility, mixed breadth or trends - normal market conditions\n" +
        "• High risk: High volatility, weak breadth, choppy trends - be cautious\n\n" +
        "Use this to adjust your position sizes. Low risk environments allow for larger positions (with caution), while high risk environments suggest smaller positions or waiting for clearer conditions.",
    },
  };

  const renderInfoButton = (indicatorKey: string) => (
    <TouchableOpacity
      onPress={() => setInfoModal(indicatorKey)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.infoButton}
    >
      <MaterialIcons name="info-outline" size={16} color={colors.text.muted} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Crypto Decision Dashboard</Text>
          <Text style={styles.subtitle}>
            At-a-glance signals to quickly decide whether to buy, sell, or wait.
          </Text>
        </View>

        <View style={styles.selectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(["BTC", "ETH", "SUI", "ADA", "MONAD"] as CoinSymbol[]).map(
              (symbol) => {
                const isSelected = symbol === selected;
                return (
                  <TouchableOpacity
                    key={symbol}
                    style={[
                      styles.selectorPill,
                      isSelected && styles.selectorPillActive,
                    ]}
                    activeOpacity={0.9}
                    onPress={() => setSelected(symbol)}
                  >
                    <Text
                      style={[
                        styles.selectorLabel,
                        isSelected && styles.selectorLabelActive,
                      ]}
                    >
                      {symbol}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </ScrollView>
        </View>

        <View style={styles.timeRangeContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TIME_RANGES.map((range) => {
              const isSelected = range.key === timeRange;
              return (
                <TouchableOpacity
                  key={range.key}
                  style={[
                    styles.rangePill,
                    isSelected && styles.rangePillActive,
                  ]}
                  activeOpacity={0.9}
                  onPress={() => setTimeRange(range.key)}
                >
                  <Text
                    style={[
                      styles.rangeLabel,
                      isSelected && styles.rangeLabelActive,
                    ]}
                  >
                    {range.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Coin Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Coin Details</Text>
          {isCoinDetailsFetching ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.loadingText}>Loading coin data…</Text>
            </View>
          ) : isCoinDetailsError ? (
            <Text style={styles.errorText}>Failed to load coin details.</Text>
          ) : coinDetails ? (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Current Price</Text>
                <Text style={styles.detailValue}>
                  {formatPrice(coinDetails.currentPrice)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>24h Change</Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color:
                        typeof coinDetails.priceChange24h === "number"
                          ? coinDetails.priceChange24h >= 0
                            ? colors.success.text
                            : colors.danger.text
                          : colors.text.secondary,
                    },
                  ]}
                >
                  {formatPct(coinDetails.priceChange24h)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>7d Change</Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color:
                        typeof coinDetails.priceChange7d === "number"
                          ? coinDetails.priceChange7d >= 0
                            ? colors.success.text
                            : colors.danger.text
                          : colors.text.secondary,
                    },
                  ]}
                >
                  {formatPct(coinDetails.priceChange7d)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>30d Change</Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color:
                        typeof coinDetails.priceChange30d === "number"
                          ? coinDetails.priceChange30d >= 0
                            ? colors.success.text
                            : colors.danger.text
                          : colors.text.secondary,
                    },
                  ]}
                >
                  {formatPct(coinDetails.priceChange30d)}
                </Text>
              </View>

              <View style={styles.detailDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Market Cap</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(coinDetails.marketCap)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Circulating Supply</Text>
                <Text style={styles.detailValue}>
                  {formatLargeNumber(coinDetails.circulatingSupply)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Volume (24h)</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(coinDetails.volume24h)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Dominance</Text>
                <Text style={styles.detailValue}>
                  {typeof dominance === "number"
                    ? `${dominance.toFixed(2)}%`
                    : "--"}
                </Text>
              </View>

              <View style={styles.detailDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>All-Time High</Text>
                <Text style={styles.detailValue}>
                  {formatPrice(coinDetails.ath)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>% from ATH</Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color:
                        typeof percentFromAth === "number"
                          ? percentFromAth >= 0
                            ? colors.success.text
                            : colors.danger.text
                          : colors.text.secondary,
                    },
                  ]}
                >
                  {formatPct(percentFromAth)}
                </Text>
              </View>

              {coinDetails.athDate && (
                <Text style={styles.athDateText}>
                  ATH Date: {new Date(coinDetails.athDate).toLocaleDateString()}
                </Text>
              )}
            </>
          ) : null}
        </View>

        {/* Decision snapshot card */}
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <Text style={styles.cardLabel}>Decision Snapshot</Text>
            {renderInfoButton("decision-snapshot")}
          </View>
          {isAnySelectedMetricLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.loadingText}>Crunching signals…</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              <Text style={styles.coinNameLarge}>{selected}</Text>
              <Text style={[styles.decisionBias, { color: decisionBiasColor }]}>
                {decisionBias}
              </Text>
              <View style={styles.decisionRow}>
                <View style={styles.decisionBlock}>
                  <Text style={styles.metricLabel}>Short</Text>
                  <Text style={styles.metricDescription}>(1h)</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color:
                          typeof oneHourChange === "number"
                            ? oneHourChange >= 0
                              ? colors.success.text
                              : colors.danger.text
                            : colors.text.secondary,
                      },
                    ]}
                  >
                    {formatPct(oneHourChange)}
                  </Text>
                </View>
                <View style={styles.decisionBlock}>
                  <Text style={styles.metricLabel}>Medium</Text>
                  <Text style={styles.metricDescription}>(24h)</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color:
                          typeof oneDayChange === "number"
                            ? oneDayChange >= 0
                              ? colors.success.text
                              : colors.danger.text
                            : colors.text.secondary,
                      },
                    ]}
                  >
                    {formatPct(oneDayChange)}
                  </Text>
                </View>
                <View style={styles.decisionBlock}>
                  <Text style={styles.metricLabel}>Trend</Text>
                  <Text style={styles.metricDescription}>(1w)</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color:
                          typeof oneWeekChange === "number"
                            ? oneWeekChange >= 0
                              ? colors.success.text
                              : colors.danger.text
                            : colors.text.secondary,
                      },
                    ]}
                  >
                    {formatPct(oneWeekChange)}
                  </Text>
                </View>
              </View>
              <Text style={styles.helperText}>
                Consider acting when most timeframes and the broader market line
                up in the same direction.
              </Text>
            </>
          )}
        </View>

        {/* Current selected range card */}
        <View style={styles.cardSecondary}>
          <Text style={styles.cardLabel}>Selected Range Move</Text>
          {isPrimaryFetching ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.loadingText}>Fetching range data…</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              <View style={styles.rangeRow}>
                <Text style={styles.rangeTitle}>
                  {selected} over{" "}
                  {TIME_RANGES.find((r) => r.key === timeRange)?.label ??
                    timeRange}
                </Text>
                <Text
                  style={[
                    styles.rangeChangeValue,
                    { color: primaryChangeColor },
                  ]}
                >
                  {formatPct(primaryChange)}
                </Text>
              </View>
              <Text style={styles.rangeHint}>
                Use this when you care most about the selected time window.
              </Text>
            </>
          )}
        </View>

        {/* Market movers card */}
        <View style={styles.cardSecondary}>
          <Text style={styles.cardLabel}>Market Movers (24h)</Text>
          <View style={styles.moversRow}>
            <View style={styles.moverItem}>
              <Text style={styles.moverLabel}>BTC</Text>
              <Text
                style={[
                  styles.moverValue,
                  {
                    color:
                      typeof btc24h?.value === "number"
                        ? btc24h.value >= 0
                          ? colors.success.text
                          : colors.danger.text
                        : colors.text.secondary,
                  },
                ]}
              >
                {formatPct(btc24h?.value ?? null)}
              </Text>
            </View>
            <View style={styles.moverItem}>
              <Text style={styles.moverLabel}>ETH</Text>
              <Text
                style={[
                  styles.moverValue,
                  {
                    color:
                      typeof eth24h?.value === "number"
                        ? eth24h.value >= 0
                          ? colors.success.text
                          : colors.danger.text
                        : colors.text.secondary,
                  },
                ]}
              >
                {formatPct(eth24h?.value ?? null)}
              </Text>
            </View>
            <View style={styles.moverItem}>
              <Text style={styles.moverLabel}>MONAD</Text>
              <Text
                style={[
                  styles.moverValue,
                  {
                    color:
                      typeof monad24h?.value === "number"
                        ? monad24h.value >= 0
                          ? colors.success.text
                          : colors.danger.text
                        : colors.text.secondary,
                  },
                ]}
              >
                {formatPct(monad24h?.value ?? null)}
              </Text>
            </View>
          </View>
          <Text style={styles.rangeHint}>
            Strong moves in BTC and ETH often set the tone for the rest of the
            market.
          </Text>
        </View>

        {/* Technical overview card */}
        <View style={styles.cardSecondary}>
          <View style={styles.cardLabelRow}>
            <Text style={styles.cardLabel}>Technical Overview</Text>
          </View>
          <View style={styles.techRow}>
            <View style={styles.techColumn}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricLabel}>Volatility</Text>
                {renderInfoButton("volatility")}
              </View>
              <Text style={styles.metricDescription}>1h–1w price swings</Text>
              <Text
                style={[
                  styles.techValue,
                  volatilityLabel === "High"
                    ? { color: colors.danger.text }
                    : volatilityLabel === "Medium"
                    ? { color: colors.accent }
                    : { color: colors.success.text },
                ]}
              >
                {volatilityLabel}
              </Text>
            </View>
            <View style={styles.techColumn}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricLabel}>Trend</Text>
                {renderInfoButton("trend-consistency")}
              </View>
              <Text style={styles.metricDescription}>Consistency</Text>
              <Text style={[styles.techValue]}>{trendConsistencyLabel}</Text>
            </View>
          </View>
          <View style={styles.techRow}>
            <View style={styles.techColumn}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricLabel}>Momentum</Text>
                {renderInfoButton("momentum")}
              </View>
              <Text style={styles.metricDescription}>Short vs 24h</Text>
              <Text style={styles.techValue}>{momentumLabel}</Text>
            </View>
            <View style={styles.techColumn}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricLabel}>Pullback</Text>
                {renderInfoButton("pullback")}
              </View>
              <Text style={styles.metricDescription}>vs recent moves</Text>
              <Text style={styles.techValue}>{pullbackLabel}</Text>
            </View>
          </View>
          <View style={styles.techRow}>
            <View style={styles.techColumn}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricLabel}>Rel. strength</Text>
                {renderInfoButton("relative-strength")}
              </View>
              <Text style={styles.metricDescription}>vs BTC (24h)</Text>
              <Text style={styles.techValue}>{relativeStrengthLabel}</Text>
            </View>
            <View style={styles.techColumn}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricLabel}>Market breadth</Text>
                {renderInfoButton("market-breadth")}
              </View>
              <Text style={styles.metricDescription}>Majors green</Text>
              <Text style={styles.techValue}>{marketBreadthLabel}</Text>
            </View>
          </View>
          <View style={styles.techRow}>
            <View style={styles.techColumn}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricLabel}>BTC dominance</Text>
                {renderInfoButton("btc-dominance")}
              </View>
              <Text style={styles.metricDescription}>Vs majors (24h)</Text>
              <Text style={styles.techValue}>{btcDominanceLabel}</Text>
            </View>
          </View>
          <View style={styles.riskRow}>
            <Text style={[styles.smartHelper, { marginTop: 10, flex: 1 }]}>
              {riskLabel}
            </Text>
            {renderInfoButton("risk")}
          </View>
        </View>

        {/* Info Modal */}
        <Modal
          visible={infoModal !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setInfoModal(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setInfoModal(null)}
          >
            <TouchableOpacity
              style={styles.modalContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              {infoModal && infoExplanations[infoModal] && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {infoExplanations[infoModal].title}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setInfoModal(null)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons
                        name="close"
                        size={24}
                        color={colors.text.primary}
                      />
                    </TouchableOpacity>
                  </View>
                  <ScrollView
                    style={styles.modalScroll}
                    showsVerticalScrollIndicator={true}
                  >
                    <Text style={styles.modalText}>
                      {infoExplanations[infoModal].content}
                    </Text>
                  </ScrollView>
                </>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingBottom: 80,
  },
  content: {
    paddingTop: 32,
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
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: colors.text.secondary,
  },
  selectorContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  timeRangeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  selectorPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginRight: 8,
  },
  selectorPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.shadow,
    shadowOpacity: Platform.OS === "ios" ? 0.35 : 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  selectorLabelActive: {
    color: colors.text.white,
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
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  cardSecondary: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  cardLabel: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    color: colors.text.muted,
    marginBottom: 16,
  },
  cardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  infoButton: {
    marginLeft: 6,
    padding: 2,
  },
  metricLabelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  riskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background.card,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text.primary,
    flex: 1,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.secondary,
  },
  coinNameLarge: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 4,
  },
  decisionBias: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
  },
  decisionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  decisionBlock: {
    flex: 1,
    marginRight: 8,
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
  coinName: {
    marginTop: 8,
    fontSize: 16,
    color: colors.text.secondary,
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.text.secondary,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.primary,
  },
  metricDescription: {
    fontSize: 11,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  rangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  rangeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
    flex: 1,
    paddingRight: 8,
  },
  rangeChangeValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  rangeHint: {
    marginTop: 8,
    fontSize: 11,
    color: colors.text.secondary,
  },
  moversRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  moverItem: {
    flex: 1,
    marginRight: 8,
  },
  moverLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 2,
  },
  moverValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  smartHelper: {
    marginTop: 6,
    fontSize: 11,
    color: colors.text.secondary,
  },
  techRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  techColumn: {
    flex: 1,
    marginRight: 8,
  },
  techValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.primary,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text.secondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
    textAlign: "right",
    flex: 1,
  },
  detailDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 8,
  },
  athDateText: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 4,
    fontStyle: "italic",
  },
});
