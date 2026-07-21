import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import {
  DAILY_ENERGY_DETAIL_PATHNAME,
  ENERGY_METRIC_EXPLAINER_PATHNAME,
} from "@/lib/data/energy/energyMetricExplainerRoutes";
import type { DailyEnergyCardDto } from "@/lib/data/dash/useDailyEnergyCard";
import { buildDailyMonitorEnergyEstimatedRating } from "@/lib/data/dash/dailyMonitorPresentationRatings";
import { getEnergyFactorRows } from "@/lib/ui/energy/energyPresentation";
import {
  DashCompactCardHeader,
  dashCompactDescriptorTextStyle,
  dashCompactPrimaryValueTextStyle,
} from "@/lib/ui/dash/DashCompactCardHeader";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
} from "@/lib/ui/theme/uiTokens";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";

type Props = {
  energy: DailyEnergyCardDto | undefined;
  loading: boolean;
  error: string | null;
  /** Consumer card title. Defaults to “Daily Energy”. */
  title?: string;
};

function formatRange(energy: DailyEnergyCardDto): string {
  const low = Math.round(energy.estimatedKcal.low).toLocaleString();
  const high = Math.round(energy.estimatedKcal.high).toLocaleString();
  return `${low}\u2013${high} kcal`;
}

export function DailyEnergyCard({
  energy,
  loading,
  error,
  title = "Daily Energy",
}: Props): React.ReactElement {
  const router = useRouter();
  const rows = energy ? getEnergyFactorRows(energy) : [];
  const estimatedRating = buildDailyMonitorEnergyEstimatedRating();

  const canOpenEnergy = !loading && !error && energy != null;

  const onOpenEnergy = useCallback(() => {
    if (!canOpenEnergy) return;
    router.push(DAILY_ENERGY_DETAIL_PATHNAME);
  }, [canOpenEnergy, router]);

  const headerA11y = useMemo(() => {
    if (loading) return `${title} header. Loading daily energy.`;
    if (error) return `${title} header. Could not load data.`;
    if (!energy) return `${title} header. Not enough data yet to estimate energy.`;
    return `${title}. Estimated ${Math.round(energy.estimatedKcal.low).toLocaleString()} to ${Math.round(energy.estimatedKcal.high).toLocaleString()} kilocalories. ${estimatedRating.accessibilityLabel} Opens Daily Energy details.`;
  }, [loading, error, energy, title, estimatedRating.accessibilityLabel]);

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={headerA11y}
        accessibilityHint="Opens Daily Energy details"
        disabled={!canOpenEnergy}
        onPress={onOpenEnergy}
        style={({ pressed }) => [styles.headerPressable, pressed && canOpenEnergy && styles.headerPressed]}
      >
        <DashCompactCardHeader
          title={title}
          rating={
            !loading && !error && energy != null
              ? {
                  label: estimatedRating.label,
                  accessibilityLabel: estimatedRating.accessibilityLabel,
                }
              : null
          }
        />
        {loading ? <Text style={styles.status}>Loading daily energy\u2026</Text> : null}
        {!loading && error ? <Text style={styles.status}>Could not load daily energy</Text> : null}
        {!loading && !error && !energy ? (
          <Text style={styles.status}>Not enough data yet to estimate energy.</Text>
        ) : null}
        {!loading && !error && energy ? (
          <>
            <Text style={styles.rangeValue}>{formatRange(energy)}</Text>
            <Text style={styles.subtitle}>Estimated burn today</Text>
          </>
        ) : null}
      </Pressable>
      {!loading && !error && energy ? (
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
  headerPressable: {
    borderRadius: 10,
    marginHorizontal: -6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  headerPressed: {
    opacity: 0.92,
  },
  subtitle: dashCompactDescriptorTextStyle,
  status: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
  },
  rangeValue: dashCompactPrimaryValueTextStyle,
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
