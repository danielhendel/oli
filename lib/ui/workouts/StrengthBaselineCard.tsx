import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { StrengthBaselineCardModel } from "@/lib/data/workouts/strengthBaselineCardModel";
import { STRENGTH_BASELINE_CARD_DEFINITION_SENTENCE } from "@/lib/ui/workouts/strengthBaselineCopy";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import { ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY } from "@/lib/ui/activity/activityUiTypography";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { StrengthBaselineFrequencyMarkers } from "@/lib/ui/workouts/StrengthBaselineFrequencyMarkers";
import {
  StrengthBaselineFrequencyTrack,
  strengthBaselineFrequencyTrackAccessibilityPercent,
} from "@/lib/ui/workouts/StrengthBaselineFrequencyTrack";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { ACTIVITY_STEP_RATING_TIERS } from "@/lib/utils/activityStepRating";

import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
type StrengthBaselineCardProps = {
  loading: boolean;
  model: StrengthBaselineCardModel | null;
};

export function StrengthBaselineCard({ loading, model }: StrengthBaselineCardProps) {
  const tierIdx = model != null ? Math.min(model.activityTierIndexForBar, ACTIVITY_STEP_RATING_TIERS.length - 1) : 0;
  const tierPill = ACTIVITY_STEP_RATING_TIERS[tierIdx]!;
  const percent =
    model != null
      ? strengthBaselineFrequencyTrackAccessibilityPercent(
          model.activityTierIndexForBar,
          model.fillWidth01Override,
        )
      : 0;
  const baselineA11y =
    model == null
      ? "Strength Baseline"
      : `Strength Baseline. ${model.ratingLabel}. 90 Day Avg ${model.compactValuePrimary}.`;

  return (
    <View style={styles.card}>
      <View style={styles.topRow} accessibilityRole="header" accessible accessibilityLabel={baselineA11y}>
        <View style={styles.titlePillGroup}>
          <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
            Strength Baseline
          </Text>
          {!loading && model != null ? (
            <ActivityRatingPill
              label={model.ratingLabel}
              color={tierPill.color}
              backgroundColor={tierPill.backgroundColor}
              emphasis="subtle"
              compactChrome
              labelTypography={ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY}
              testID="strength-baseline-rating-pill"
            />
          ) : null}
        </View>
      </View>

      {loading ? <LoadingState variant="inline" message="Loading workouts…" /> : null}

      {!loading && model != null ? (
        <>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>90 Day Avg</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {model.compactValuePrimary}
            </Text>
          </View>
          <View style={styles.progressCluster} testID="strength-baseline-instrument-cluster">
            <StrengthBaselineFrequencyTrack
              testID="strength-baseline-frequency-bar"
              tierIndex={model.activityTierIndexForBar}
              fillWidth01={model.fillWidth01Override}
              wrapperProps={{
                accessibilityRole: "progressbar",
                accessibilityValue: { now: percent, min: 0, max: 100 },
              }}
            />
            <StrengthBaselineFrequencyMarkers />
          </View>
        </>
      ) : null}

      <Text style={styles.footerCaption}>{STRENGTH_BASELINE_CARD_DEFINITION_SENTENCE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 15,
    gap: 11,
    ...elevatedCardSurfaceStyle,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
    paddingBottom: 2,
  },
  titlePillGroup: {
    flexDirection: "row",
    alignItems: "baseline",
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  cardTitle: {
    ...strengthMetricCardTitleTextStyle,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
    paddingTop: 1,
  },
  metricLabel: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "500",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.08,
  },
  metricValue: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.28,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
    flexShrink: 1,
  },
  progressCluster: {
    gap: 3,
  },
  footerCaption: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
});
