import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { colors } from "@/theme/colors";
import {
  coinGeckoService,
  CoinSymbol,
  CoinData,
} from "@/services/CoinGeckoService";

export function Home() {
  const [selected, setSelected] = useState<CoinSymbol>("BTC");
  const [coins, setCoins] = useState<Partial<Record<CoinSymbol, CoinData>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const data = await coinGeckoService.get24hChanges();
        if (!mounted) return;
        setCoins(data);
        setError(null);
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : "Failed to load market data."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const activeCoin = coins[selected];
  const change = activeCoin?.usdPrice24hrPercentChange ?? null;
  const isPositive = typeof change === "number" && change > 0;
  const isNegative = typeof change === "number" && change < 0;

  const changeColor = isPositive
    ? colors.success.text
    : isNegative
    ? colors.danger.text
    : colors.text.secondary;

  const formattedChange =
    typeof change === "number" ? `${change.toFixed(2)}%` : "--";

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>24h Crypto Moves</Text>
          <Text style={styles.subtitle}>
            Track quick sentiment shifts for your favorite coins.
          </Text>
        </View>

        <View style={styles.selectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {coinGeckoService.coins.map((coin) => {
              const isSelected = coin.symbol === selected;
              return (
                <TouchableOpacity
                  key={coin.symbol}
                  style={[
                    styles.selectorPill,
                    isSelected && styles.selectorPillActive,
                  ]}
                  activeOpacity={0.9}
                  onPress={() => setSelected(coin.symbol)}
                >
                  <Text
                    style={[
                      styles.selectorLabel,
                      isSelected && styles.selectorLabelActive,
                    ]}
                  >
                    {coin.symbol}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>24h Change</Text>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.loadingText}>Fetching market data…</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              <Text style={[styles.changeValue, { color: changeColor }]}>
                {formattedChange}
              </Text>
              <Text style={styles.coinName}>
                {activeCoin?.name ?? selected}
              </Text>
            </>
          )}
        </View>
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
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
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
    marginBottom: 24,
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
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  selectorLabelActive: {
    color: colors.text.white,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 20,
    padding: 20,
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
  changeValue: {
    fontSize: 40,
    fontWeight: "800",
  },
  coinName: {
    marginTop: 8,
    fontSize: 16,
    color: colors.text.secondary,
  },
});
