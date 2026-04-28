import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ActivityRollupInlineError } from "@/lib/data/activity/activityRollupErrorSummary";
import { strengthBaselineDashPresentationFromModel } from "@/lib/data/workouts/strengthBaselineDashPresentation";
import type { StrengthBaselineCardModel } from "@/lib/data/workouts/strengthBaselineCardModel";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import { ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY } from "@/lib/ui/activity/activityUiTypography";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";
import {
  StrengthBaselineFrequencyTrack,
  strengthBaselineFrequencyTrackAccessibilityPercent,
} from "@/lib/ui/workouts/StrengthBaselineFrequencyTrack";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

const SUBTITLE_90 = "90-day average workouts per week";

export type StrengthBaselineDashCardProps = {
  hasUser: boolean;
  loading: boolean;
  error: ActivityRollupInlineError | null;
  model: StrengthBaselineCardModel | null;
  onPress: () => void;
};

export function StrengthBaselineDashCard({
  hasUser,
  loading,
  error,
  model,
  onPress,
}: StrengthBaselineDashCardProps) {
  const presentation = strengthBaselineDashPresentationFromModel(model);
  const showProgress = hasUser && !loading && error == null && presentation.kind === "ready";

  const accessibilityLabel = (() => {
    if (!hasUser) return "Strength. Sign in to view your 90-day average workouts per week. Opens Strength.";
    if (loading) return "Strength. Loading 90-day average workouts per week. Opens Strength.";
    if (error != null) return "Strength. Could not load workout history. Try again. Opens Strength.";
    if (presentation.kind === "ready") {
      return `Strength. ${presentation.ratingLabel}. 90-day average workouts per week ${presentation.valueDigits}. Opens Strength.`;
    }
    return "Strength. Opens Strength.";
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
              Strength
            </Text>
            {showProgress ? (
              <ActivityRatingPill
                label={presentation.ratingLabel}
                color={presentation.pillColor}
                backgroundColor={presentation.pillBackgroundColor}
                emphasis="subtle"
                compactChrome
                labelTypography={ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY}
                testID="dash-strength-baseline-rating-pill"
              />
            ) : null}
          </View>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.subtitleLeft} numberOfLines={2}>
            {SUBTITLE_90}
          </Text>
          {showProgress ? (
            <Text style={styles.metricValueRight} numberOfLines={1}>
              {presentation.valueDigits}
            </Text>
          ) : null}
        </View>

        {loading ? <LoadingState variant="inline" message="Loading workouts…" /> : null}

        {!loading && !hasUser ? (
          <Text style={styles.emptyMuted}>Sign in to see your strength training baseline.</Text>
        ) : null}

        {!loading && hasUser && error != null ? (
          <ErrorState
            variant="inline"
            title="Workouts data unavailable"
            message={error.message}
            requestId={error.requestId}
            onRetry={error.onRetry}
          />
        ) : null}

        {showProgress ? (
          <View style={styles.barBlock}>
            <StrengthBaselineFrequencyTrack
            testID="dash-strength-baseline-frequency-bar"
            tierIndex={presentation.tierIndexForBar}
            fillWidth01={presentation.fillWidth01}
            wrapperProps={{
              accessibilityRole: "progressbar",
              accessibilityValue: {
                now: strengthBaselineFrequencyTrackAccessibilityPercent(
                  presentation.tierIndexForBar,
                  presentation.fillWidth01,
                ),
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
