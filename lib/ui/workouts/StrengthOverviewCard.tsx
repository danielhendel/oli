import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StrengthOverviewCardModel } from "@/lib/data/workouts/strengthOverviewCardModel";
import type {
  StrengthOverviewTimeframeRatingLabel,
  StrengthOverviewTimeframeRatingTier,
} from "@/lib/data/workouts/strengthOverviewTimeframeRating";
import { computeStrengthOverviewMarkerPosition01 } from "@/lib/data/workouts/strengthOverviewTimeframeRating";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";
import { MODULE_OVERVIEW_SEGMENT_ZONE_FILLS } from "@/lib/ui/overview/moduleOverviewSegmentZoneFills";
import { MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME } from "@/lib/ui/overview/moduleOverviewStrengthTierPillChrome";
import { MODULE_OVERVIEW_SEGMENTED_TRACK } from "@/lib/ui/overview/moduleOverviewSegmentedTrackMetrics";
import { SegmentedZoneTrack } from "@/lib/ui/primitives/SegmentedZoneTrack";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { LoadingState } from "@/lib/ui/ScreenStates";

type StrengthOverviewCardProps = {
  loading: boolean;
  model: StrengthOverviewCardModel | null;
  onViewMore?: () => void;
};

/**
 * Strength-only tier palette (not Body interpretation zones).
 * Tier chroma: Low #E57373, Developing #F2D06B, Solid #E6A15C, Strong #5EC08C, Optimal #5C8FE6.
 * Bar segments: same RGB at ~35% alpha on white. Pill fg + marker: full-opacity tier hex. Pill bg: soft opaque tints.
 */
const STRENGTH_OVERVIEW_TIER_COLORS: Record<
  StrengthOverviewTimeframeRatingTier,
  { pillBg: string; pillFg: string; segmentFill: string }
> = {
  low: {
    pillBg: MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[0].pillBg,
    pillFg: MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[0].pillFg,
    segmentFill: MODULE_OVERVIEW_SEGMENT_ZONE_FILLS[0],
  },
  developing: {
    pillBg: MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[1].pillBg,
    pillFg: MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[1].pillFg,
    segmentFill: MODULE_OVERVIEW_SEGMENT_ZONE_FILLS[1],
  },
  solid: {
    pillBg: MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[2].pillBg,
    pillFg: MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[2].pillFg,
    segmentFill: MODULE_OVERVIEW_SEGMENT_ZONE_FILLS[2],
  },
  strong: {
    pillBg: MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[3].pillBg,
    pillFg: MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[3].pillFg,
    segmentFill: MODULE_OVERVIEW_SEGMENT_ZONE_FILLS[3],
  },
  optimal: {
    pillBg: MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[4].pillBg,
    pillFg: MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[4].pillFg,
    segmentFill: MODULE_OVERVIEW_SEGMENT_ZONE_FILLS[4],
  },
};

const RATING_PILL_STYLES: Record<StrengthOverviewTimeframeRatingTier, { bg: string; fg: string }> =
  (Object.keys(STRENGTH_OVERVIEW_TIER_COLORS) as StrengthOverviewTimeframeRatingTier[]).reduce(
    (acc, tier) => {
      const t = STRENGTH_OVERVIEW_TIER_COLORS[tier];
      acc[tier] = { bg: t.pillBg, fg: t.pillFg };
      return acc;
    },
    {} as Record<StrengthOverviewTimeframeRatingTier, { bg: string; fg: string }>,
  );

const TIER_FOR_RATING_LABEL: Record<StrengthOverviewTimeframeRatingLabel, StrengthOverviewTimeframeRatingTier> = {
  Low: "low",
  Developing: "developing",
  Solid: "solid",
  Strong: "strong",
  Optimal: "optimal",
};

/** Marker fill matches rating pill foreground for the tier (not bar position / segment under the dot). */
export function getStrengthOverviewMarkerColorForRatingLabel(
  label: StrengthOverviewTimeframeRatingLabel,
): string {
  return RATING_PILL_STYLES[TIER_FOR_RATING_LABEL[label]].fg;
}

/**
 * Bar segment fills (Low → Optimal); same tuple as {@link MODULE_OVERVIEW_SEGMENT_ZONE_FILLS}.
 */
export const STRENGTH_OVERVIEW_TIER_ZONE_BG = MODULE_OVERVIEW_SEGMENT_ZONE_FILLS;

function clamp01(x: number): number {
  if (!Number.isFinite(x) || x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

function StrengthOverviewConsistencyTrack({
  testID,
  markerPosition01,
  ratingLabel,
}: {
  testID: string;
  /** 0–1 along full track; must already lie inside the tier segment (see {@link computeStrengthOverviewMarkerPosition01}). */
  markerPosition01: number;
  ratingLabel: StrengthOverviewTimeframeRatingLabel;
}) {
  const marker01 = clamp01(markerPosition01);
  const pct = Math.round(marker01 * 100);
  const markerColor = getStrengthOverviewMarkerColorForRatingLabel(ratingLabel);

  return (
    <SegmentedZoneTrack
      zoneColors={STRENGTH_OVERVIEW_TIER_ZONE_BG}
      testID={testID}
      markerPosition01={marker01}
      showMarker
      markerBackgroundColor={markerColor}
      dotSize={MODULE_OVERVIEW_SEGMENTED_TRACK.dotSize}
      barHeight={MODULE_OVERVIEW_SEGMENTED_TRACK.barHeight}
      trackRadius={MODULE_OVERVIEW_SEGMENTED_TRACK.trackRadius}
      wrapperProps={{
        accessibilityRole: "progressbar",
        accessibilityValue: { now: pct, min: 0, max: 100 },
      }}
    />
  );
}

export function StrengthOverviewCard({ loading, model, onViewMore }: StrengthOverviewCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.headerRow, workoutOverviewInCardHeaderStyles.row]}>
        <Text style={workoutOverviewInCardHeaderStyles.title}>Overview</Text>
        {onViewMore != null ? (
          <Pressable
            onPress={onViewMore}
            accessibilityRole="button"
            accessibilityLabel="View more"
            hitSlop={8}
            style={({ pressed }) => [
              workoutOverviewInCardHeaderStyles.linkHit,
              pressed && workoutOverviewInCardHeaderStyles.linkPressed,
            ]}
          >
            <Text style={workoutOverviewInCardHeaderStyles.link}>View More</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <LoadingState variant="inline" message="Loading workouts…" />
      ) : model != null ? (
        <View style={moduleOverviewMetricLayoutStyles.metricGroups}>
          {model.timeframes.map((tf) => {
            const pill = RATING_PILL_STYLES[tf.rating.tier];
            const a11y = `${tf.label}. ${tf.rating.label}. ${tf.compactStatsSummary}.`;
            return (
              <View key={tf.key} style={moduleOverviewMetricLayoutStyles.metricBlock} accessibilityLabel={a11y} accessible>
                <View style={moduleOverviewMetricLayoutStyles.topRow}>
                  <View style={moduleOverviewMetricLayoutStyles.titlePillCluster}>
                    <Text style={moduleOverviewMetricLayoutStyles.primaryLabel} numberOfLines={1}>
                      {tf.label}
                    </Text>
                    <View style={[moduleOverviewMetricLayoutStyles.ratingPillShell, { backgroundColor: pill.bg }]}>
                      <Text style={[moduleOverviewMetricLayoutStyles.ratingPillLabel, { color: pill.fg }]} numberOfLines={1}>
                        {tf.rating.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={moduleOverviewMetricLayoutStyles.trailingValue} numberOfLines={1}>
                    {tf.compactStatsSummary}
                  </Text>
                </View>
                <StrengthOverviewConsistencyTrack
                  testID={`strength-overview-consistency-bar-${tf.key}`}
                  markerPosition01={computeStrengthOverviewMarkerPosition01({
                    tier: tf.rating.tier,
                    scoringAvg: tf.rating.scoringAvg,
                  })}
                  ratingLabel={tf.rating.label}
                />
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
    padding: 16,
    gap: 12,
  },
  headerRow: {
    alignItems: "flex-start",
  },
});
