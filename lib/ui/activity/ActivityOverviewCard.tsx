import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ActivityOverviewCardModel } from "@/lib/data/activity/activityOverviewCardModel";
import type { ActivityRollupInlineError } from "@/lib/data/activity/activityRollupErrorSummary";
import {
  ActivityTierProgressTrack,
  activityTierProgressAccessibilityPercent,
} from "@/lib/ui/activity/ActivityTierProgressTrack";
import { ACTIVITY_OVERVIEW_SUBTLE_PILL_LABEL_TYPOGRAPHY } from "@/lib/ui/activity/activityUiTypography";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  getStepRatingActivityDescriptorPill,
  getStepRatingTierIndex,
  stepsFromLocaleDigitString,
} from "@/lib/utils/activityStepRating";

type ActivityOverviewCardProps = {
  loading: boolean;
  error: { message: string; requestId: string | null; onRetry: () => void } | null;
  model: ActivityOverviewCardModel | null;
  /** Rollup wave: yesterday key not merged yet — show loading for that row only. */
  yesterdayRowLoading?: boolean;
  /** Yesterday daily-facts failure — replaces the Yesterday row body (retry preserved). */
  yesterdayRowError?: ActivityRollupInlineError | null;
};

/**
 * Parse overview row summaries: averages (`…/day`) or single-day totals (`… steps`) for Yesterday.
 */
function overviewRowFigureDisplay(compactStatsSummary: string): { numeric: true; digits: string } | { numeric: false; text: string } {
  const s = compactStatsSummary.trim();
  const perDay = s.match(/^([\d,]+)\/day$/);
  if (perDay) return { numeric: true, digits: perDay[1]! };
  const steps = s.match(/^([\d,]+)\s+steps$/i);
  if (steps) return { numeric: true, digits: steps[1]! };
  return { numeric: false, text: s };
}

function ActivityOverviewTierProgressTrack({ testID, tierIndex }: { testID: string; tierIndex: number | null }) {
  const pct = activityTierProgressAccessibilityPercent(tierIndex);
  return (
    <ActivityTierProgressTrack
      testID={testID}
      tierIndex={tierIndex}
      wrapperProps={{
        accessibilityRole: "progressbar",
        accessibilityValue: { now: pct, min: 0, max: 100 },
      }}
    />
  );
}

/**
 * Activity overview — Yesterday first, then fixed windows (7d / 30d / YTD / 12m).
 */
export function ActivityOverviewCard({
  loading,
  error,
  model,
  yesterdayRowLoading = false,
  yesterdayRowError = null,
}: ActivityOverviewCardProps) {
  return (
    <View style={styles.card}>
      {loading ? <LoadingState variant="inline" message="Loading steps…" /> : null}
      {!loading && error != null ? (
        <ErrorState
          variant="inline"
          message={error.message}
          requestId={error.requestId}
          onRetry={error.onRetry}
        />
      ) : null}
      {!loading && model != null ? (
        <View style={styles.metricGroups}>
          {model.timeframes.map((tf) => {
            if (tf.key === "yesterday") {
              if (yesterdayRowLoading) {
                return (
                  <View key="yesterday" style={styles.metricBlock}>
                    <View style={[moduleOverviewMetricLayoutStyles.topRow, styles.activityRowTop]}>
                      <Text style={styles.rowLabel} numberOfLines={1}>
                        Yesterday
                      </Text>
                    </View>
                    <LoadingState variant="inline" message="Loading steps…" />
                  </View>
                );
              }
              if (yesterdayRowError != null) {
                return (
                  <View key="yesterday" style={styles.metricBlock}>
                    <View style={[moduleOverviewMetricLayoutStyles.topRow, styles.activityRowTop]}>
                      <Text style={styles.rowLabel} numberOfLines={1}>
                        Yesterday
                      </Text>
                    </View>
                    <ErrorState
                      variant="inline"
                      message={yesterdayRowError.message}
                      requestId={yesterdayRowError.requestId}
                      onRetry={yesterdayRowError.onRetry}
                    />
                  </View>
                );
              }
            }

            const figure = overviewRowFigureDisplay(tf.compactStatsSummary);
            const rowSteps = figure.numeric ? stepsFromLocaleDigitString(figure.digits) : null;
            const rating = rowSteps != null ? getStepRatingActivityDescriptorPill(rowSteps) : null;
            const tierIndex = rowSteps != null ? getStepRatingTierIndex(rowSteps) : null;
            const a11y =
              rating != null
                ? `${tf.label}. ${rating.label}. ${tf.compactStatsSummary}.`
                : `${tf.label}. ${tf.compactStatsSummary}.`;
            return (
              <View key={tf.key} style={styles.metricBlock} accessible accessibilityLabel={a11y}>
                <View style={[moduleOverviewMetricLayoutStyles.topRow, styles.activityRowTop]}>
                  <View style={styles.titlePillLeftGroup}>
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {tf.label}
                    </Text>
                    {rating != null ? (
                      <ActivityRatingPill
                        label={rating.label}
                        color={rating.color}
                        backgroundColor={rating.backgroundColor}
                        emphasis="subtle"
                        compactChrome
                        labelTypography={ACTIVITY_OVERVIEW_SUBTLE_PILL_LABEL_TYPOGRAPHY}
                        testID={`activity-overview-rating-${tf.key}`}
                      />
                    ) : null}
                  </View>
                  {figure.numeric ? (
                    <Text style={styles.rowFigure} numberOfLines={1}>
                      {figure.digits}
                    </Text>
                  ) : (
                    <Text style={styles.rowNonNumeric} numberOfLines={1} ellipsizeMode="tail">
                      {figure.text}
                    </Text>
                  )}
                </View>
                <ActivityOverviewTierProgressTrack testID={`activity-overview-steps-bar-${tf.key}`} tierIndex={tierIndex} />
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
  activityRowTop: {
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
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: "#1C1C1E",
    letterSpacing: -0.44,
    flexShrink: 0,
  },
  rowNonNumeric: {
    flexShrink: 1,
    maxWidth: "52%",
    fontSize: 15,
    fontWeight: "600",
    color: "#8E8E93",
    letterSpacing: -0.12,
    textAlign: "right",
  },
});
