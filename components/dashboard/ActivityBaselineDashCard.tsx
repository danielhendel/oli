import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ActivityDailyDetailsCardModel } from "@/lib/data/activity/activityOverviewCardModel";
import { ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA } from "@/lib/data/activity/activityOverviewSufficiency";
import type { ActivityRollupInlineError } from "@/lib/data/activity/activityRollupErrorSummary";
import { activityBaselineDashProgressFromModel } from "@/lib/data/activity/activityBaselineDashPresentation";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import {
  ActivityTierProgressTrack,
  activityTierProgressAccessibilityPercent,
} from "@/lib/ui/activity/ActivityTierProgressTrack";
import { ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY } from "@/lib/ui/activity/activityUiTypography";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

const SUBTITLE_90_DAY = "90-day average steps";

export type ActivityBaselineDashCardProps = {
  hasUser: boolean;
  /** Auth init or steps rollup in flight. */
  loading: boolean;
  error: ActivityRollupInlineError | null;
  model: ActivityDailyDetailsCardModel | null;
  onPress: () => void;
};

export function ActivityBaselineDashCard({
  hasUser,
  loading,
  error,
  model,
  onPress,
}: ActivityBaselineDashCardProps) {
  const presentation = activityBaselineDashProgressFromModel(model);
  const showProgress = hasUser && !loading && error == null && presentation.kind === "ready";

  const accessibilityLabel = (() => {
    if (!hasUser) return "Activity. Sign in to view your 90-day average steps. Opens Activity.";
    if (loading) return "Activity. Loading 90-day average steps. Opens Activity.";
    if (error != null) return "Activity. Could not load step history. Try again. Opens Activity.";
    if (presentation.kind === "ready") {
      return `Activity. ${presentation.rating.label}. 90-day average steps ${presentation.averageStepsDigits}. Opens Activity.`;
    }
    if (model?.compactStatsSummary === ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA) {
      return `Activity. Not enough step history for a 90-day average yet. Opens Activity.`;
    }
    return "Activity. Opens Activity.";
  })();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressablePressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.card}>
        <View style={[moduleOverviewMetricLayoutStyles.topRow, styles.titleRow]}>
          <View style={styles.titleCluster}>
            <Text style={styles.title} numberOfLines={1}>
              Activity
            </Text>
            {showProgress ? (
              <ActivityRatingPill
                label={presentation.rating.label}
                color={presentation.rating.color}
                backgroundColor={presentation.rating.backgroundColor}
                emphasis="subtle"
                compactChrome
                labelTypography={ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY}
                testID="dash-activity-baseline-rating-pill"
              />
            ) : null}
          </View>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.subtitleLeft} numberOfLines={2}>
            {SUBTITLE_90_DAY}
          </Text>
          {showProgress ? (
            <Text style={styles.metricValueRight} numberOfLines={1}>
              {presentation.averageStepsDigits}
            </Text>
          ) : null}
        </View>

        {loading ? <LoadingState variant="inline" message="Loading steps…" /> : null}

        {!loading && !hasUser ? (
          <Text style={styles.emptyMuted}>Sign in to see your 90-day step baseline.</Text>
        ) : null}

        {!loading && hasUser && error != null ? (
          <ErrorState
            variant="inline"
            title="Steps data incomplete"
            message={error.message}
            requestId={error.requestId}
            onRetry={error.onRetry}
          />
        ) : null}

        {hasUser && !loading && error == null && presentation.kind === "insufficient" ? (
          <Text style={styles.emptyMuted}>
            We need a full 90 days of step rollups to show your baseline. Keep logging activity in Oli.
          </Text>
        ) : null}

        {showProgress ? (
          <View style={styles.barBlock}>
            <ActivityTierProgressTrack
            testID="dash-activity-baseline-progress"
            tierIndex={presentation.stepsTierIndex}
            fillWidth01Override={presentation.activityDisplayScaleFill01}
            wrapperProps={{
              accessibilityRole: "progressbar",
              accessibilityValue: {
                now: activityTierProgressAccessibilityPercent(presentation.stepsTierIndex, {
                  fillWidth01Override: presentation.activityDisplayScaleFill01,
                }),
                min: 0,
                max: 100,
              },
            }}
          />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: "100%",
    minHeight: 44,
  },
  pressablePressed: {
    opacity: 0.92,
  },
  card: {
    width: "100%",
    borderRadius: 12,
    padding: 15,
    gap: 11,
    ...elevatedCardSurfaceStyle,
    backgroundColor: "#FFFFFF",
  },
  titleRow: {
    alignItems: "baseline",
    paddingBottom: 2,
  },
  titleCluster: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
  },
  title: strengthMetricCardTitleTextStyle,
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  subtitleLeft: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "400",
    color: UI_TEXT_TERTIARY_LABEL,
    letterSpacing: -0.18,
  },
  metricValueRight: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.44,
    flexShrink: 0,
    maxWidth: "46%",
    textAlign: "right",
  },
  barBlock: {
    ...moduleOverviewMetricLayoutStyles.metricBlock,
    gap: 10,
  },
  emptyMuted: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
  },
});
