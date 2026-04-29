import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { StrengthHistorySummaryModel } from "@/lib/data/workouts/strengthHistorySummaryModel";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import { ACTIVITY_OVERVIEW_SUBTLE_PILL_LABEL_TYPOGRAPHY } from "@/lib/ui/activity/activityUiTypography";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { StrengthBaselineFrequencyTrack } from "@/lib/ui/workouts/StrengthBaselineFrequencyTrack";
import { ACTIVITY_STEP_RATING_TIERS } from "@/lib/utils/activityStepRating";

type Props = {
  model: StrengthHistorySummaryModel;
};

export function StrengthHistorySummaryCard({ model }: Props) {
  return (
    <View style={styles.card} testID="strength-history-summary-card">
      <View style={styles.metricGroups}>
        {model.rows.map((row) => {
          const chrome = row.tierIndexForBar != null ? ACTIVITY_STEP_RATING_TIERS[row.tierIndexForBar] : null;
          const a11y = row.tierLabel
            ? `${row.label}. ${row.tierLabel}. ${row.displayValue}.`
            : `${row.label}. ${row.displayValue}.`;
          return (
            <View key={row.key} style={styles.metricBlock} accessible accessibilityLabel={a11y}>
              <View style={[moduleOverviewMetricLayoutStyles.topRow, styles.rowTop]}>
                <View style={styles.titlePillLeftGroup}>
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {row.label}
                  </Text>
                  {row.tierLabel && chrome ? (
                    <ActivityRatingPill
                      label={row.tierLabel}
                      color={chrome.color}
                      backgroundColor={chrome.backgroundColor}
                      emphasis="subtle"
                      compactChrome
                      labelTypography={ACTIVITY_OVERVIEW_SUBTLE_PILL_LABEL_TYPOGRAPHY}
                      testID={`strength-history-tier-${row.key}`}
                    />
                  ) : null}
                </View>
                <Text style={row.hasEnoughData ? styles.rowFigure : styles.rowNonNumeric} numberOfLines={1}>
                  {row.displayValue}
                </Text>
              </View>
              {row.helperText ? <Text style={styles.helperText}>{row.helperText}</Text> : null}
              <StrengthBaselineFrequencyTrack
                testID={`strength-history-progress-${row.key}`}
                tierIndex={row.tierIndexForBar ?? 0}
                fillWidth01={row.progressFill01 ?? 0}
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
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    gap: 11,
    ...elevatedCardSurfaceStyle,
  },
  metricGroups: {
    gap: 12,
  },
  metricBlock: {
    gap: 8,
  },
  rowTop: {
    alignItems: "baseline",
  },
  titlePillLeftGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
  },
  rowLabel: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.34,
  },
  rowFigure: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: "#1C1C1E",
    letterSpacing: -0.28,
    flexShrink: 1,
    textAlign: "right",
  },
  rowNonNumeric: {
    flexShrink: 0,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "600",
    color: "#8E8E93",
    letterSpacing: -0.28,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 17,
    color: "#8E8E93",
    letterSpacing: -0.08,
  },
});
