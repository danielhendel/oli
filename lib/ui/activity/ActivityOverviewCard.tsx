import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ActivityOverviewCardModel } from "@/lib/data/activity/activityOverviewCardModel";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";
import { MODULE_OVERVIEW_SEGMENT_ZONE_FILLS } from "@/lib/ui/overview/moduleOverviewSegmentZoneFills";
import { MODULE_OVERVIEW_SEGMENTED_TRACK } from "@/lib/ui/overview/moduleOverviewSegmentedTrackMetrics";
import { SegmentedZoneTrack } from "@/lib/ui/primitives/SegmentedZoneTrack";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";

/** Neutral marker fill — same elevated dot treatment as Strength overview (not tier-colored). */
const ACTIVITY_OVERVIEW_MARKER_FILL = "#1F2937";

type ActivityOverviewCardProps = {
  loading: boolean;
  error: { message: string; requestId: string | null; onRetry: () => void } | null;
  model: ActivityOverviewCardModel | null;
};

function clamp01(x: number): number {
  if (!Number.isFinite(x) || x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

function ActivityOverviewPlacementTrack({ testID, markerPosition01 }: { testID: string; markerPosition01: number }) {
  const marker01 = clamp01(markerPosition01);
  const pct = Math.round(marker01 * 100);
  return (
    <SegmentedZoneTrack
      zoneColors={MODULE_OVERVIEW_SEGMENT_ZONE_FILLS}
      testID={testID}
      markerPosition01={marker01}
      showMarker
      markerBackgroundColor={ACTIVITY_OVERVIEW_MARKER_FILL}
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

/**
 * Activity Overview — visual family aligned with StrengthOverviewCard (card shell, row rhythm, segmented bar).
 * No rating pills: steps use neutral placement bands only (dash recap geometry), not Strength consistency tiers.
 */
export function ActivityOverviewCard({ loading, error, model }: ActivityOverviewCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.headerRow, workoutOverviewInCardHeaderStyles.row]}>
        <Text style={workoutOverviewInCardHeaderStyles.title}>Overview</Text>
      </View>

      {loading ? (
        <LoadingState variant="inline" message="Loading steps…" />
      ) : error != null ? (
        <ErrorState
          variant="inline"
          message={error.message}
          requestId={error.requestId}
          onRetry={error.onRetry}
        />
      ) : model != null ? (
        <View style={moduleOverviewMetricLayoutStyles.metricGroups}>
          {model.timeframes.map((tf) => {
            const a11y = `${tf.label}. ${tf.compactStatsSummary}.`;
            return (
              <View key={tf.key} style={moduleOverviewMetricLayoutStyles.metricBlock} accessibilityLabel={a11y} accessible>
                <View style={moduleOverviewMetricLayoutStyles.topRow}>
                  <View style={styles.leftSummary}>
                    <Text style={styles.timeframeLabel} numberOfLines={1}>
                      {tf.label}
                    </Text>
                    <Text style={styles.resultSummary} numberOfLines={1} ellipsizeMode="tail">
                      {tf.compactStatsSummary}
                    </Text>
                  </View>
                </View>
                <ActivityOverviewPlacementTrack
                  testID={`activity-overview-steps-bar-${tf.key}`}
                  markerPosition01={tf.markerPosition01}
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
    ...elevatedCardSurfaceStyle,
  },
  headerRow: {
    alignItems: "flex-start",
    paddingBottom: 2,
  },
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
    color: "#6E6E73",
    letterSpacing: -0.12,
    flexShrink: 0,
  },
  resultSummary: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "600",
    color: "#3C3C43",
    letterSpacing: -0.15,
  },
});
