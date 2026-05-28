import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { SleepBaselineVm } from "@/lib/data/sleep/buildSleepBaselineVm";
import { ENERGY_BASELINE_FILL_COLOR } from "@/lib/ui/energy/EnergyBaselineProgressTrack";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  BASELINE_HISTORY_HEADING_SECTION_MARGIN_BOTTOM,
  baselineOverviewHistoryCardLayoutStyles,
} from "@/lib/ui/workouts/baselineOverviewHistoryCardLayout";
import { baselineOverviewExplainerStyles } from "@/lib/ui/workouts/baselineOverviewExplainerStyle";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { SleepDurationProgressTrack } from "@/lib/ui/sleep/SleepDurationProgressTrack";

import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

/**
 * @deprecated The Sleep Baseline card now renders {@link SleepBaselineVm.personalizedExplainer}.
 * Kept exported so any test or external consumer still referencing the legacy literal continues
 * to compile; not used by the card itself.
 */
export const SLEEP_BASELINE_HISTORY_EXPLAINER_COPY =
  "Your sleep baseline is the average nightly duration across key time ranges.";

/**
 * Subtle copy shown under the heading while the trailing baseline windows (7 / 30 / 90 / YTD /
 * 12 Month) are still hydrating from the sleep-night rollup. Once {@link SleepBaselineCardProps.loading}
 * flips false the personalized explainer renders in its place.
 */
export const SLEEP_BASELINE_CALCULATING_COPY = "Calculating sleep baseline…";

export type SleepBaselineCardProps = {
  model: SleepBaselineVm;
  /**
   * True while baseline-window cells are still settling. Renders a polished "Calculating…"
   * subtitle in place of the personalized explainer and leaves rows in their empty-row chrome
   * (dashes + zero-width bars). Defaults to `false` for back-compat with existing consumers.
   */
  loading?: boolean;
  testID?: string;
};

export function SleepBaselineCard({
  model,
  loading = false,
  testID = "sleep-baseline-card",
}: SleepBaselineCardProps) {
  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel="Sleep Baseline">
      <View style={styles.headingBlock}>
        <View style={baselineOverviewHistoryCardLayoutStyles.headingExplainerStack}>
          <Text style={styles.cardHeading} accessibilityRole="header">
            Sleep Baseline
          </Text>
          {loading ? (
            <Text
              style={baselineOverviewExplainerStyles.explainer}
              testID="sleep-baseline-loading-subtitle"
              accessibilityLabel={SLEEP_BASELINE_CALCULATING_COPY}
            >
              {SLEEP_BASELINE_CALCULATING_COPY}
            </Text>
          ) : (
            <Text
              style={baselineOverviewExplainerStyles.explainer}
              testID="sleep-baseline-explainer"
            >
              {model.personalizedExplainer}
            </Text>
          )}
        </View>
      </View>

      <View
        style={baselineOverviewHistoryCardLayoutStyles.metricGroups}
        testID="sleep-baseline-metric-groups"
      >
        {model.rows.map((row) => {
          const pct = row.progressFill01 != null ? Math.round(row.progressFill01 * 100) : 0;
          const a11y = `${row.label}. ${row.displayValue}.`;
          return (
            <View
              key={row.key}
              style={baselineOverviewHistoryCardLayoutStyles.metricBlock}
              accessible
              accessibilityLabel={a11y}
            >
              <View
                style={[
                  moduleOverviewMetricLayoutStyles.topRow,
                  baselineOverviewHistoryCardLayoutStyles.rowTop,
                ]}
              >
                <View style={styles.rowLabelGroup}>
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {row.label}
                  </Text>
                </View>
                <Text
                  style={row.hasEnoughData ? styles.rowFigure : styles.rowNonNumeric}
                  numberOfLines={1}
                >
                  {row.displayValue}
                </Text>
              </View>
              <SleepDurationProgressTrack
                testID={`sleep-baseline-progress-${row.key}`}
                fill01={row.progressFill01}
                fillColor={ENERGY_BASELINE_FILL_COLOR}
                wrapperProps={{
                  accessibilityRole: "progressbar",
                  accessibilityLabel: `${row.label} sleep duration level, ${pct} percent of 8 hour target`,
                  accessibilityValue: { now: pct, min: 0, max: 100 },
                }}
              />
            </View>
          );
        })}
      </View>
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
  rowLabelGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
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
  rowNonNumeric: {
    flexShrink: 0,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.26,
  },
});
