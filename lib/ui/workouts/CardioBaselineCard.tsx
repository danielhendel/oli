import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { CardioBaselineCardModel } from "@/lib/data/workouts/cardioBaselineCardModel";
import { cardioDistanceTierIndexForBar, cardioDistanceTierLabel } from "@/lib/data/workouts/cardioSessionPresentation";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import { ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY } from "@/lib/ui/activity/activityUiTypography";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { StrengthBaselineFrequencyTrack } from "@/lib/ui/workouts/StrengthBaselineFrequencyTrack";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { ACTIVITY_STEP_RATING_TIERS } from "@/lib/utils/activityStepRating";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  CARDIO_BASELINE_MARKER_VALUES_MILES,
  cardioBaselineMilesToVisualScale01,
} from "@/lib/ui/workouts/cardioBaselineScale";

import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY, UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";
const CARDIO_BASELINE_CARD_DEFINITION_SENTENCE =
  "Your typical weekly cardio distance based on the past 90 days";

type CardioBaselineCardProps = {
  loading: boolean;
  model: CardioBaselineCardModel | null;
};

export function CardioBaselineCard({ loading, model }: CardioBaselineCardProps) {
  const isReady = model?.kind === "ready";
  const activeTierIndex =
    isReady ? cardioDistanceTierIndexForBar(model.tier) : 0;
  const tierChrome = ACTIVITY_STEP_RATING_TIERS[activeTierIndex]!;
  const fillWidth01 =
    isReady && Number.isFinite(model.progressMilesPerWeekScaleValue)
      ? cardioBaselineMilesToVisualScale01(model.progressMilesPerWeekScaleValue)
      : 0;
  const progressPercent = Math.round(fillWidth01 * 100);

  return (
    <View style={styles.card}>
      <View style={styles.topRow} accessibilityRole="header">
        <View style={styles.titlePillGroup}>
          <Text style={styles.cardTitle}>Cardio Baseline</Text>
          {!loading ? (
            <ActivityRatingPill
              label={isReady ? cardioDistanceTierLabel(model.tier) : "Insufficient data"}
              color={tierChrome.color}
              backgroundColor={tierChrome.backgroundColor}
              emphasis="subtle"
              compactChrome
              labelTypography={ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY}
              testID="cardio-baseline-rating-pill"
            />
          ) : null}
        </View>
        {!loading && isReady ? (
          <Text style={styles.primaryValueFigure} numberOfLines={1}>
            {model.headlineLabel}
          </Text>
        ) : null}
      </View>

      {loading ? <LoadingState variant="inline" message="Loading workouts…" /> : null}

      {!loading && isReady ? (
        <View style={styles.progressCluster} testID="cardio-baseline-instrument-cluster">
          <StrengthBaselineFrequencyTrack
            testID="cardio-baseline-frequency-bar"
            tierIndex={activeTierIndex}
            fillWidth01={fillWidth01}
            wrapperProps={{
              accessibilityRole: "progressbar",
              accessibilityValue: { now: progressPercent, min: 0, max: 100 },
            }}
          />
          <View style={styles.markerRow} testID="cardio-baseline-frequency-markers">
            {CARDIO_BASELINE_MARKER_VALUES_MILES.map((m, i, arr) => (
              <View key={`${m}-${i}`} style={styles.markerCell}>
                <Text style={styles.markerLabel} numberOfLines={1}>
                  {i === arr.length - 1 ? "40+" : String(m)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <Text style={styles.footerCaption}>{CARDIO_BASELINE_CARD_DEFINITION_SENTENCE}</Text>
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
  primaryValueFigure: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.34,
    flexShrink: 1,
    textAlign: "right",
  },
  progressCluster: {
    gap: 6,
  },
  markerRow: {
    flexDirection: "row",
    width: "100%",
    alignItems: "flex-start",
  },
  markerCell: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },
  markerLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: UI_TEXT_TERTIARY_LABEL,
    letterSpacing: -0.08,
    textAlign: "center",
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
