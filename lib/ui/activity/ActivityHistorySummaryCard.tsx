import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  ActivityHistoryRangeKey,
  ActivityHistorySummaryModel,
  ActivityHistorySummaryRowLabel,
} from "@/lib/data/activity/activityHistorySummaryModel";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import {
  ActivityTierProgressTrack,
  activityTierProgressAccessibilityPercent,
} from "@/lib/ui/activity/ActivityTierProgressTrack";
import { ACTIVITY_OVERVIEW_SUBTLE_PILL_LABEL_TYPOGRAPHY } from "@/lib/ui/activity/activityUiTypography";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";
import type { ActivityRollupInlineError } from "@/lib/data/activity/activityRollupErrorSummary";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  BASELINE_HISTORY_HEADING_SECTION_MARGIN_BOTTOM,
  baselineOverviewHistoryCardLayoutStyles,
} from "@/lib/ui/workouts/baselineOverviewHistoryCardLayout";
import { baselineOverviewExplainerStyles } from "@/lib/ui/workouts/baselineOverviewExplainerStyle";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { ACTIVITY_STEP_RATING_TIERS } from "@/lib/utils/activityStepRating";
import { ErrorState } from "@/lib/ui/ScreenStates";

export const ACTIVITY_BASELINE_HISTORY_EXPLAINER_COPY =
  "Your activity baseline is the average daily steps across key time ranges.";

export type ActivityBaselineTierPillPressContext = {
  rowKey: ActivityHistoryRangeKey;
  rowLabel: ActivityHistorySummaryRowLabel;
  tierLabel: string;
  averageStepsPerDay: number | null;
  tierIndexForBar: number;
  displayValue: string;
};

type Props = {
  model: ActivityHistorySummaryModel;
  onPressViewMore?: () => void;
  onPressActivityRangeExplainer?: (ctx: ActivityBaselineTierPillPressContext) => void;
  /** Rollup fetch aggregate warning — shown above baseline rows when present. */
  rollupAggregateError?: ActivityRollupInlineError | null;
};

function HistoryTierProgressTrack({
  testID,
  tierIndex,
  fillWidth01Override,
}: {
  testID: string;
  tierIndex: number | null;
  fillWidth01Override: number | null;
}) {
  const pct = activityTierProgressAccessibilityPercent(
    tierIndex,
    fillWidth01Override != null ? { fillWidth01Override } : undefined,
  );
  return (
    <ActivityTierProgressTrack
      testID={testID}
      tierIndex={tierIndex}
      fillWidth01Override={fillWidth01Override}
      wrapperProps={{
        accessibilityRole: "progressbar",
        accessibilityValue: { now: pct, min: 0, max: 100 },
      }}
    />
  );
}

export function ActivityHistorySummaryCard({
  model,
  onPressViewMore,
  onPressActivityRangeExplainer,
  rollupAggregateError,
}: Props) {
  return (
    <View style={styles.card} testID="activity-history-summary-card">
      <View style={styles.headingBlock}>
        <View style={baselineOverviewHistoryCardLayoutStyles.headingExplainerStack}>
          <View style={styles.baselineHeaderRow}>
            <Text style={styles.cardHeading} accessibilityRole="header">
              Activity Baseline
            </Text>
            {onPressViewMore != null ? (
              <Pressable
                onPress={onPressViewMore}
                accessibilityRole="button"
                accessibilityLabel="View Activity Analytics"
                hitSlop={8}
                style={({ pressed }) => [
                  workoutOverviewInCardHeaderStyles.linkHit,
                  styles.viewMoreHit,
                  pressed && workoutOverviewInCardHeaderStyles.linkPressed,
                ]}
                testID="activity-history-summary-view-more"
              >
                <Text style={workoutOverviewInCardHeaderStyles.link}>View More →</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={baselineOverviewExplainerStyles.explainer} testID="activity-history-baseline-explainer">
            {ACTIVITY_BASELINE_HISTORY_EXPLAINER_COPY}
          </Text>
        </View>
      </View>

      {rollupAggregateError != null ? (
        <ErrorState
          variant="inline"
          message={rollupAggregateError.message}
          requestId={rollupAggregateError.requestId}
          onRetry={rollupAggregateError.onRetry}
        />
      ) : null}

      <View style={baselineOverviewHistoryCardLayoutStyles.metricGroups} testID="activity-history-metric-groups">
        {model.rows.map((row) => {
          const chrome = row.tierIndexForBar != null ? ACTIVITY_STEP_RATING_TIERS[row.tierIndexForBar] : null;
          const a11y = row.tierLabel
            ? `${row.label}. ${row.tierLabel}. ${row.displayValue}.`
            : `${row.label}. ${row.displayValue}.`;
          const pillInteractive =
            onPressActivityRangeExplainer != null &&
            row.tierLabel != null &&
            chrome != null &&
            row.tierIndexForBar != null;
          return (
            <View key={row.key} style={baselineOverviewHistoryCardLayoutStyles.metricBlock} accessible accessibilityLabel={a11y}>
              <View style={[moduleOverviewMetricLayoutStyles.topRow, baselineOverviewHistoryCardLayoutStyles.rowTop]}>
                <View style={styles.titlePillLeftGroup}>
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {row.label}
                  </Text>
                  {row.tierLabel && chrome ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="View activity range explanation"
                      disabled={!pillInteractive}
                      onPress={() => {
                        if (!pillInteractive || row.tierIndexForBar == null || row.tierLabel == null) return;
                        onPressActivityRangeExplainer({
                          rowKey: row.key,
                          rowLabel: row.label,
                          tierLabel: row.tierLabel,
                          averageStepsPerDay: row.averageStepsPerDay,
                          tierIndexForBar: row.tierIndexForBar,
                          displayValue: row.displayValue,
                        });
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                      style={({ pressed }) => [styles.tierPillHit, pressed && pillInteractive && styles.tierPillHitPressed]}
                      testID={`activity-history-tier-pill-${row.key}`}
                    >
                      <ActivityRatingPill
                        label={row.tierLabel}
                        color={chrome.color}
                        backgroundColor={chrome.backgroundColor}
                        emphasis="subtle"
                        compactChrome
                        opticalBaselineNudge={false}
                        labelTypography={ACTIVITY_OVERVIEW_SUBTLE_PILL_LABEL_TYPOGRAPHY}
                        testID={`activity-history-tier-${row.key}`}
                      />
                    </Pressable>
                  ) : null}
                </View>
                <Text style={row.hasEnoughData ? styles.rowFigure : styles.rowNonNumeric} numberOfLines={1}>
                  {row.displayValue}
                </Text>
              </View>
              {row.helperText ? <Text style={styles.helperText}>{row.helperText}</Text> : null}
              <HistoryTierProgressTrack
                testID={`activity-history-progress-${row.key}`}
                tierIndex={row.tierIndexForBar}
                fillWidth01Override={row.progressFill01}
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
    gap: 0,
    ...elevatedCardSurfaceStyle,
  },
  headingBlock: {
    marginBottom: BASELINE_HISTORY_HEADING_SECTION_MARGIN_BOTTOM,
  },
  baselineHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardHeading: {
    ...strengthMetricCardTitleTextStyle,
    flexShrink: 1,
  },
  viewMoreHit: {
    minHeight: 44,
    justifyContent: "center",
    flexShrink: 0,
  },
  titlePillLeftGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tierPillHit: {
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  tierPillHitPressed: {
    opacity: 0.72,
  },
  rowLabel: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.26,
  },
  rowFigure: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: "#1C1C1E",
    letterSpacing: -0.26,
    flexShrink: 1,
    textAlign: "right",
  },
  rowNonNumeric: {
    flexShrink: 0,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: "#8E8E93",
    letterSpacing: -0.26,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 17,
    color: "#8E8E93",
    letterSpacing: -0.08,
  },
});
