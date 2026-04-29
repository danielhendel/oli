import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { CardioBaselineCardModel } from "@/lib/data/workouts/cardioBaselineCardModel";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import { ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY } from "@/lib/ui/activity/activityUiTypography";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { StrengthBaselineFrequencyTrack } from "@/lib/ui/workouts/StrengthBaselineFrequencyTrack";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { ACTIVITY_STEP_RATING_TIERS } from "@/lib/utils/activityStepRating";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { cardioBaselineMilesToVisualScale01 } from "@/lib/ui/workouts/cardioBaselineScale";

const CARDIO_BASELINE_CARD_DEFINITION_SENTENCE =
  "Your typical weekly cardio distance based on the past 90 days";
const CARDIO_BASELINE_MARKERS = ["0", "2.5", "7.5", "15", "25"] as const;

type CardioBaselineCardProps = {
  loading: boolean;
  model: CardioBaselineCardModel | null;
};

function tierLabel(tier: "very_low" | "low" | "active" | "high" | "very_high"): string {
  if (tier === "very_low") return "Very Low";
  if (tier === "very_high") return "Very High";
  if (tier === "low") return "Low";
  if (tier === "active") return "Active";
  return "High";
}

function tierIndex(tier: "very_low" | "low" | "active" | "high" | "very_high"): number {
  if (tier === "very_low") return 0;
  if (tier === "low") return 1;
  if (tier === "active") return 2;
  if (tier === "high") return 3;
  return 4;
}

export function CardioBaselineCard({ loading, model }: CardioBaselineCardProps) {
  const isReady = model?.kind === "ready";
  const activeTierIndex = isReady ? tierIndex(model.tier) : 0;
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
              label={isReady ? tierLabel(model.tier) : "Insufficient data"}
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
            {CARDIO_BASELINE_MARKERS.map((label) => (
              <Text key={label} style={styles.markerLabel}>
                {label}
              </Text>
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
    backgroundColor: "#FFFFFF",
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
    color: "#1C1C1E",
    letterSpacing: -0.34,
    flexShrink: 1,
    textAlign: "right",
  },
  progressCluster: {
    gap: 6,
  },
  markerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  markerLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#636366",
    letterSpacing: -0.08,
  },
  footerCaption: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "400",
    color: "#8E8E93",
    letterSpacing: -0.2,
    marginBottom: 6,
  },
});
