import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { SleepBaselineVm } from "@/lib/data/sleep/buildSleepBaselineVm";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import { ACTIVITY_OVERVIEW_SUBTLE_PILL_LABEL_TYPOGRAPHY } from "@/lib/ui/activity/activityUiTypography";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  BASELINE_HISTORY_HEADING_SECTION_MARGIN_BOTTOM,
  baselineOverviewHistoryCardLayoutStyles,
} from "@/lib/ui/workouts/baselineOverviewHistoryCardLayout";
import { baselineOverviewExplainerStyles } from "@/lib/ui/workouts/baselineOverviewExplainerStyle";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { SleepDurationProgressTrack } from "@/lib/ui/sleep/SleepDurationProgressTrack";
import type { OuraRatingLabel } from "@/lib/format/ouraScore";
import { getSleepMetricColor } from "@/lib/ui/recovery/getSleepMetricColor";

function durationLabelToOuraRating(label: string): OuraRatingLabel {
  if (label === "Low") return "Pay attention";
  if (label === "Optimal" || label === "Good" || label === "Fair") return label;
  return "Pay attention";
}

import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export const SLEEP_BASELINE_HISTORY_EXPLAINER_COPY =
  "Your sleep baseline is the average nightly duration across key time ranges.";

export type SleepBaselineCardProps = {
  model: SleepBaselineVm;
  testID?: string;
};

export function SleepBaselineCard({ model, testID = "sleep-baseline-card" }: SleepBaselineCardProps) {
  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel="Sleep Baseline">
      <View style={styles.headingBlock}>
        <View style={baselineOverviewHistoryCardLayoutStyles.headingExplainerStack}>
          <Text style={styles.cardHeading} accessibilityRole="header">
            Sleep Baseline
          </Text>
          <Text style={baselineOverviewExplainerStyles.explainer} testID="sleep-baseline-explainer">
            {SLEEP_BASELINE_HISTORY_EXPLAINER_COPY}
          </Text>
        </View>
      </View>

      <View style={baselineOverviewHistoryCardLayoutStyles.metricGroups} testID="sleep-baseline-metric-groups">
        {model.rows.map((row) => {
          const fillColor =
            row.statusLabel != null
              ? getSleepMetricColor(durationLabelToOuraRating(row.statusLabel)).fillColor
              : "#C7C7CC";
          const pct =
            row.progressFill01 != null ? Math.round(row.progressFill01 * 100) : 0;
          const a11y = row.statusLabel
            ? `${row.label}. ${row.statusLabel}. ${row.displayValue}.`
            : `${row.label}. ${row.displayValue}.`;
          return (
            <View
              key={row.key}
              style={baselineOverviewHistoryCardLayoutStyles.metricBlock}
              accessible
              accessibilityLabel={a11y}
            >
              <View style={[moduleOverviewMetricLayoutStyles.topRow, baselineOverviewHistoryCardLayoutStyles.rowTop]}>
                <View style={styles.titlePillLeftGroup}>
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {row.label}
                  </Text>
                  {row.statusLabel && row.statusColor && row.statusBackgroundColor ? (
                    <ActivityRatingPill
                      label={row.statusLabel}
                      color={row.statusColor}
                      backgroundColor={row.statusBackgroundColor}
                      emphasis="subtle"
                      compactChrome
                      opticalBaselineNudge={false}
                      labelTypography={ACTIVITY_OVERVIEW_SUBTLE_PILL_LABEL_TYPOGRAPHY}
                      testID={`sleep-baseline-tier-pill-${row.key}`}
                    />
                  ) : null}
                </View>
                <Text style={row.hasEnoughData ? styles.rowFigure : styles.rowNonNumeric} numberOfLines={1}>
                  {row.displayValue}
                </Text>
              </View>
              <SleepDurationProgressTrack
                testID={`sleep-baseline-progress-${row.key}`}
                fill01={row.progressFill01}
                fillColor={fillColor}
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
  titlePillLeftGroup: {
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
  rowNonNumeric: {
    flexShrink: 0,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.26,
  },
});
