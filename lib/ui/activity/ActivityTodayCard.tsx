import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ActivityRollupInlineError } from "@/lib/data/activity/activityRollupErrorSummary";
import type { ActivityTodayOverviewCardModel } from "@/lib/data/activity/activityTodayOverviewCardModel";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import {
  ActivityTierProgressTrack,
  activityTierProgressAccessibilityPercent,
} from "@/lib/ui/activity/ActivityTierProgressTrack";
import { ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY } from "@/lib/ui/activity/activityUiTypography";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { RECENT_WORKOUT_ROW_META_TEXT_STYLE } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";

export type ActivityTodayCardProps = {
  loading: boolean;
  model: ActivityTodayOverviewCardModel | null;
  error?: ActivityRollupInlineError | null;
  testID?: string;
};

export function ActivityTodayCard({
  loading,
  model,
  error,
  testID = "activity-today-card",
}: ActivityTodayCardProps) {
  const pct =
    model != null
      ? activityTierProgressAccessibilityPercent(model.activityTierIndexForBar, {
          fillWidth01Override: model.fillWidth01Override,
        })
      : 0;

  const rootA11y =
    loading || model == null
      ? "Today activity summary. Loading."
      : error != null
        ? `Today. ${error.message}`
        : `Today. ${model.tierPill.label}. Steps. ${model.compactStatsSummaryForA11y}.${model.subtitle ? ` ${model.subtitle}` : ""} Step level ${pct} percent.`;

  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel={rootA11y}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>Today</Text>
        {!loading && model != null ? (
          <ActivityRatingPill
            label={model.tierPill.label}
            color={model.tierPill.color}
            backgroundColor={model.tierPill.backgroundColor}
            emphasis="subtle"
            compactChrome
            labelTypography={ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY}
            testID="activity-today-tier-pill"
          />
        ) : null}
      </View>

      {loading ? <LoadingState variant="inline" message="Loading steps…" /> : null}

      {!loading && error != null ? (
        <ErrorState
          variant="inline"
          message={error.message}
          requestId={error.requestId}
          onRetry={error.onRetry}
        />
      ) : null}

      {!loading && error == null && model != null ? (
        <View style={styles.body}>
          <View style={styles.stepsRow}>
            <Text style={styles.stepsLabel}>Steps</Text>
            <Text style={styles.stepsFigure} numberOfLines={1}>
              {model.stepsDigits ?? "—"}
            </Text>
          </View>
          <ActivityTierProgressTrack
            testID="activity-today-tier-progress"
            tierIndex={model.activityTierIndexForBar}
            fillWidth01Override={model.fillWidth01Override}
            wrapperProps={{
              accessibilityRole: "progressbar",
              accessibilityLabel: `Today step activity level, ${model.tierPill.label}, ${pct} percent of tier scale`,
              accessibilityValue: { now: pct, min: 0, max: 100 },
            }}
          />
          {model.subtitle != null && model.subtitle.length > 0 ? (
            <Text style={styles.subtitle} testID="activity-today-subtitle">
              {model.subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 7,
    ...elevatedCardSurfaceStyle,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },
  cardTitle: {
    ...strengthMetricCardTitleTextStyle,
  },
  body: {
    gap: 6,
    paddingTop: 4,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  stepsLabel: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    color: "#000000",
    letterSpacing: -0.38,
    flexShrink: 1,
  },
  stepsFigure: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: "#1C1C1E",
    letterSpacing: -0.44,
    flexShrink: 0,
  },
  subtitle: {
    ...RECENT_WORKOUT_ROW_META_TEXT_STYLE,
    lineHeight: 18,
  },
});
