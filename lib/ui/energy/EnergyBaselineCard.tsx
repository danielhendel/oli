import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  ENERGY_BASELINE_EXPLAINER_COPY,
  type EnergyBaselineVm,
} from "@/lib/data/energy/buildEnergyBaselineVm";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  BASELINE_HISTORY_HEADING_SECTION_MARGIN_BOTTOM,
  baselineOverviewHistoryCardLayoutStyles,
} from "@/lib/ui/workouts/baselineOverviewHistoryCardLayout";
import { baselineOverviewExplainerStyles } from "@/lib/ui/workouts/baselineOverviewExplainerStyle";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { EnergyBaselineProgressTrack } from "@/lib/ui/energy/EnergyBaselineProgressTrack";
import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type EnergyBaselineCardProps = {
  loading: boolean;
  model: EnergyBaselineVm | null;
  testID?: string;
};

/**
 * Energy Baseline card — multi-row baseline pattern matching {@link SleepBaselineCard} 1:1
 * (tokens, spacing rhythm, row layout, unavailable styling, progress bar geometry).
 *
 * Status chips intentionally omitted (Option A): no client-side fitness judgments. Each row
 * shows label, formatted average kcal/day range, and a single shared-style progress bar whose
 * fill is `avgHigh / globalMaxHigh` (see `buildEnergyBaselineVm`).
 */
export function EnergyBaselineCard({
  loading,
  model,
  testID = "energy-baseline-card",
}: EnergyBaselineCardProps) {
  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel="Energy Baseline">
      <View style={styles.headingBlock}>
        <View style={baselineOverviewHistoryCardLayoutStyles.headingExplainerStack}>
          <Text style={styles.cardHeading} accessibilityRole="header">
            Energy Baseline
          </Text>
          <Text
            style={baselineOverviewExplainerStyles.explainer}
            testID="energy-baseline-explainer"
          >
            {ENERGY_BASELINE_EXPLAINER_COPY}
          </Text>
        </View>
      </View>

      {loading ? <LoadingState variant="inline" message="Loading energy baseline\u2026" /> : null}

      {!loading && model != null ? (
        <View
          style={baselineOverviewHistoryCardLayoutStyles.metricGroups}
          testID="energy-baseline-metric-groups"
        >
          {model.rows.map((row) => {
            const pct =
              row.progressFill01 != null ? Math.round(row.progressFill01 * 100) : 0;
            const a11y = `${row.label}. ${row.displayValue}.`;
            return (
              <View
                key={row.key}
                style={baselineOverviewHistoryCardLayoutStyles.metricBlock}
                accessible
                accessibilityLabel={a11y}
                testID={`energy-baseline-row-${row.key}`}
              >
                <View
                  style={[
                    moduleOverviewMetricLayoutStyles.topRow,
                    baselineOverviewHistoryCardLayoutStyles.rowTop,
                  ]}
                >
                  <View style={styles.titleLeftGroup}>
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {row.label}
                    </Text>
                  </View>
                  <Text
                    style={row.hasEnoughData ? styles.rowFigure : styles.rowUnavailable}
                    numberOfLines={1}
                  >
                    {row.displayValue}
                  </Text>
                </View>
                <EnergyBaselineProgressTrack
                  testID={`energy-baseline-progress-${row.key}`}
                  fill01={row.progressFill01}
                  wrapperProps={{
                    accessibilityRole: "progressbar",
                    accessibilityLabel: `${row.label} energy baseline level, ${pct} percent of trailing 12 month peak`,
                    accessibilityValue: { now: pct, min: 0, max: 100 },
                  }}
                />
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 15,
    gap: 0,
    ...elevatedCardSurfaceStyle,
  },
  headingBlock: {
    marginBottom: BASELINE_HISTORY_HEADING_SECTION_MARGIN_BOTTOM,
  },
  cardHeading: {
    ...strengthMetricCardTitleTextStyle,
  },
  titleLeftGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowLabel: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.26,
  },
  rowFigure: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.26,
    flexShrink: 1,
    textAlign: "right",
  },
  rowUnavailable: {
    flexShrink: 0,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.26,
    textAlign: "right",
  },
});
