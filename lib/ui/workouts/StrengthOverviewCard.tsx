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
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";

import { UI_CARD_SURFACE, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";
type StrengthOverviewCardProps = {
  loading: boolean;
  model: StrengthOverviewCardModel | null;
  onViewMore?: () => void;
};

/**
 * Strength-only tier palette (not Body interpretation zones).
 * Tier chrome comes from {@link MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME} / {@link MODULE_OVERVIEW_SEGMENT_ZONE_FILLS} (dark-elevated).
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

/** Tier tint stays on pill shell; label text reads in neutral ink (Strength overview). */
const STRENGTH_RATING_PILL_LABEL_INK = "#111827";

/** Consistency bar marker: dark neutral fill + elevated halo (see {@link SegmentedZoneTrack} `markerStyle`). */
const STRENGTH_CONSISTENCY_MARKER_FILL = "#1F2937";

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
}: {
  testID: string;
  /** 0–1 along full track; must already lie inside the tier segment (see {@link computeStrengthOverviewMarkerPosition01}). */
  markerPosition01: number;
}) {
  const marker01 = clamp01(markerPosition01);
  const pct = Math.round(marker01 * 100);

  return (
    <SegmentedZoneTrack
      zoneColors={STRENGTH_OVERVIEW_TIER_ZONE_BG}
      testID={testID}
      markerPosition01={marker01}
      showMarker
      markerBackgroundColor={STRENGTH_CONSISTENCY_MARKER_FILL}
      markerStyle="elevated"
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
                  <View style={styles.leftSummary}>
                    <Text style={styles.timeframeLabel} numberOfLines={1}>
                      {tf.label}
                    </Text>
                    <Text
                      style={styles.resultSummary}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {tf.compactStatsSummary}
                    </Text>
                  </View>
                  <View
                    style={[
                      moduleOverviewMetricLayoutStyles.ratingPillShell,
                      styles.ratingPillTrailing,
                      { backgroundColor: pill.bg },
                    ]}
                  >
                    <Text
                      style={[moduleOverviewMetricLayoutStyles.ratingPillLabel, { color: STRENGTH_RATING_PILL_LABEL_INK }]}
                      numberOfLines={1}
                    >
                      {tf.rating.label}
                    </Text>
                  </View>
                </View>
                <StrengthOverviewConsistencyTrack
                  testID={`strength-overview-consistency-bar-${tf.key}`}
                  markerPosition01={computeStrengthOverviewMarkerPosition01({
                    tier: tf.rating.tier,
                    scoringAvg: tf.rating.scoringAvg,
                  })}
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
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    ...elevatedCardSurfaceStyle,
  },
  headerRow: {
    alignItems: "flex-start",
    paddingBottom: 2,
  },
  /** Timeframe + numeric result (scan line); pill sits on the right. */
  leftSummary: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 8,
  },
  timeframeLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.12,
    flexShrink: 0,
  },
  resultSummary: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.15,
  },
  /** Overrides shared shell when pill is the trailing control (no max-width squeeze with title). */
  ratingPillTrailing: {
    flexShrink: 0,
    maxWidth: "40%",
    alignSelf: "center",
  },
});
