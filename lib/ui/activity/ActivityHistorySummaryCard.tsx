import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  ActivityHistoryRangeKey,
  ActivityHistorySummaryModel,
  ActivityHistorySummaryRowLabel,
} from "@/lib/data/activity/activityHistorySummaryModel";
import { EnergyBaselineProgressTrack } from "@/lib/ui/energy/EnergyBaselineProgressTrack";
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
import { ErrorState } from "@/lib/ui/ScreenStates";

import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

/**
 * @deprecated The Activity Baseline card now renders {@link ActivityHistorySummaryModel.personalizedExplainer}.
 * Kept exported for any tests / external consumers that still reference the literal; not used by the card itself.
 */
export const ACTIVITY_BASELINE_HISTORY_EXPLAINER_COPY =
  "Your activity baseline is the average daily steps across key time ranges.";

/**
 * @deprecated The per-row tier pill was removed in the baseline UX redesign. The data model still
 * carries `tierLabel` / `tierIndexForBar` / `progressFill01` (used for the progress fill width and
 * accessibility text) so this context type is preserved for callers that may still reference it.
 */
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
  /** Rollup fetch aggregate warning — shown above baseline rows when present. */
  rollupAggregateError?: ActivityRollupInlineError | null;
};

function HistoryTierProgressTrack({
  testID,
  fillWidth01Override,
  rowLabel,
}: {
  testID: string;
  fillWidth01Override: number | null;
  rowLabel: ActivityHistorySummaryRowLabel;
}) {
  const fill01 =
    fillWidth01Override != null && Number.isFinite(fillWidth01Override)
      ? Math.max(0, Math.min(1, fillWidth01Override))
      : null;
  const pct = fill01 != null ? Math.round(fill01 * 100) : 0;
  return (
    <EnergyBaselineProgressTrack
      testID={testID}
      fill01={fill01}
      wrapperProps={{
        accessibilityRole: "progressbar",
        accessibilityLabel: `${rowLabel} activity baseline level, ${pct} percent`,
        accessibilityValue: { now: pct, min: 0, max: 100 },
      }}
    />
  );
}

export function ActivityHistorySummaryCard({
  model,
  onPressViewMore,
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
          <Text
            style={baselineOverviewExplainerStyles.explainer}
            testID="activity-history-baseline-explainer"
          >
            {model.personalizedExplainer}
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
              {row.helperText ? <Text style={styles.helperText}>{row.helperText}</Text> : null}
              <HistoryTierProgressTrack
                testID={`activity-history-progress-${row.key}`}
                fillWidth01Override={row.progressFill01}
                rowLabel={row.label}
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
  helperText: {
    fontSize: 13,
    lineHeight: 17,
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.08,
  },
});
