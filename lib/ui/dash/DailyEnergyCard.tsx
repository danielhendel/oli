import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ENERGY_METRIC_EXPLAINER_PATHNAME } from "@/lib/data/energy/energyMetricExplainerRoutes";
import type { DailyEnergyCardDto } from "@/lib/data/dash/useDailyEnergyCard";
import { getEnergyFactorRows } from "@/lib/ui/energy/energyPresentation";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

type Props = {
  energy: DailyEnergyCardDto | undefined;
  loading: boolean;
  error: string | null;
};

function formatRange(energy: DailyEnergyCardDto): string {
  const low = Math.round(energy.estimatedKcal.low).toLocaleString();
  const high = Math.round(energy.estimatedKcal.high).toLocaleString();
  return `${low}\u2013${high} kcal`;
}

function capitalizeConfidence(confidence: DailyEnergyCardDto["confidence"]): string {
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

function formatVariancePct(variancePct: number): string {
  return `${(variancePct * 100).toFixed(1)}%`;
}

export function DailyEnergyCard({ energy, loading, error }: Props): React.ReactElement {
  const router = useRouter();
  const rows = energy ? getEnergyFactorRows(energy) : [];

  const onPressMetricRow = useCallback(
    (metricKey: (typeof rows)[number]["key"]) => {
      if (!energy) return;
      router.push({
        pathname: ENERGY_METRIC_EXPLAINER_PATHNAME,
        params: { metric: metricKey, day: energy.day },
      });
    },
    [energy, router],
  );

  return (
    <View style={styles.card} accessibilityLabel="Daily energy card">
      <Text style={styles.title}>Daily Energy</Text>
      {loading ? <Text style={styles.status}>Loading daily energy\u2026</Text> : null}
      {!loading && error ? <Text style={styles.status}>Could not load daily energy</Text> : null}
      {!loading && !error && !energy ? (
        <Text style={styles.status}>Not enough data yet to estimate energy.</Text>
      ) : null}
      {!loading && !error && energy ? (
        <>
          <Text style={styles.rangeValue}>{formatRange(energy)}</Text>
          <Text style={styles.subtitle}>Estimated burn today</Text>
          <Text style={styles.meta}>
            {`Confidence ${capitalizeConfidence(energy.confidence)} · ±`}
            {formatVariancePct(energy.variancePct)}
          </Text>
          <View style={styles.factors} accessibilityRole="list">
            {rows.map((row) => (
              <Pressable
                key={row.key}
                testID={`energy-row-${row.key}`}
                accessibilityRole="button"
                accessibilityLabel={`Open ${row.label} explanation`}
                onPress={() => {
                  onPressMetricRow(row.key);
                }}
                style={({ pressed }) => [styles.factorPressable, pressed && styles.factorPressablePressed]}
              >
                <View style={styles.factorRow}>
                  <Text style={dashMetricRowLabelTextStyle}>{row.label}</Text>
                  <View style={styles.factorRight}>
                    <Text style={dashMetricRowValueTextStyle}>{row.displayValue}</Text>
                    <Text style={styles.factorChevron} accessibilityElementsHidden importantForAccessibility="no">
                      {"\u203A"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 12,
    padding: 15,
    gap: 8,
    marginTop: 12,
    backgroundColor: UI_CARD_SURFACE,
  },
  title: strengthMetricCardTitleTextStyle,
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  status: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
  },
  rangeValue: {
    fontSize: 34,
    lineHeight: 40,
    color: UI_TEXT_PRIMARY,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_TERTIARY_LABEL,
  },
  factors: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
    paddingTop: 6,
    gap: 2,
  },
  factorPressable: {
    borderRadius: 8,
    marginHorizontal: -6,
    paddingHorizontal: 6,
    paddingVertical: 7,
    minHeight: 44,
    justifyContent: "center",
  },
  factorPressablePressed: {
    opacity: 0.75,
  },
  factorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  factorRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    flexShrink: 1,
  },
  factorChevron: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
    flexShrink: 0,
  },
});
