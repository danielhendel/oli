// lib/ui/dash/DashRecapCard.tsx
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import type { DashRecapViewModel } from "@/lib/data/dash/dashRecapViewModel";
import { dashRecapRowAccessibilityLabel } from "@/lib/data/dash/dashRecapA11y";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";
import { MODULE_OVERVIEW_SEGMENT_ZONE_FILLS } from "@/lib/ui/overview/moduleOverviewSegmentZoneFills";
import { MODULE_OVERVIEW_SEGMENTED_TRACK } from "@/lib/ui/overview/moduleOverviewSegmentedTrackMetrics";
import { SegmentedZoneTrack } from "@/lib/ui/primitives/SegmentedZoneTrack";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { formatOverviewAsOfLabel } from "@/lib/ui/body/formatOverviewAsOfLabel";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { UI_CARD_SURFACE, UI_DASH_RECAP_CARD_RADIUS } from "@/lib/ui/theme/uiTokens";

/** Marker fill: neutral gray — does not encode Strength tier semantics. */
const DASH_RECAP_PLACEMENT_MARKER_COLOR = "#6E6E73";

export type DashRecapCardProps = {
  model: DashRecapViewModel;
  onViewMore?: () => void;
};

function RecapHint({ children }: { children: string }) {
  return <Text style={styles.hint}>{children}</Text>;
}

function DailyRecapHeader({
  showAsOf,
  dayKey,
  onViewMore,
}: {
  showAsOf: boolean;
  dayKey?: string;
  onViewMore?: () => void;
}) {
  return (
    <>
      <View style={[styles.headerRow, workoutOverviewInCardHeaderStyles.row]}>
        <Text
          style={workoutOverviewInCardHeaderStyles.title}
          accessibilityRole="header"
          accessibilityLabel="Daily Recap"
        >
          Daily Recap
        </Text>
        {onViewMore != null ? (
          <Pressable
            onPress={onViewMore}
            accessibilityRole="button"
            accessibilityLabel="View more daily recap"
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
      {showAsOf && dayKey != null ? (
        <Text style={styles.asOfLabel} accessibilityLabel={`Day ${dayKey}`}>
          {formatOverviewAsOfLabel(dayKey)}
        </Text>
      ) : null}
    </>
  );
}

function PlacementTrack({ markerPosition01, testID }: { markerPosition01: number; testID: string }) {
  const m = Math.max(0, Math.min(1, markerPosition01));
  const pct = Math.round(m * 100);
  return (
    <SegmentedZoneTrack
      zoneColors={MODULE_OVERVIEW_SEGMENT_ZONE_FILLS}
      testID={testID}
      markerPosition01={m}
      showMarker
      markerBackgroundColor={DASH_RECAP_PLACEMENT_MARKER_COLOR}
      dotSize={MODULE_OVERVIEW_SEGMENTED_TRACK.dotSize}
      barHeight={MODULE_OVERVIEW_SEGMENTED_TRACK.barHeight}
      trackRadius={MODULE_OVERVIEW_SEGMENTED_TRACK.trackRadius}
      wrapperProps={{
        accessibilityRole: "progressbar",
        accessibilityLabel: `Visual placement bar. Not a health rating. ${pct} percent along display scale.`,
        accessibilityValue: { now: pct, min: 0, max: 100 },
      }}
    />
  );
}

export function DashRecapCard({ model, onViewMore }: DashRecapCardProps) {
  if (model.kind === "loading") {
    return (
      <View style={styles.card} accessibilityLabel="Daily Recap loading">
        <DailyRecapHeader showAsOf={false} {...(onViewMore != null ? { onViewMore } : {})} />
        <LoadingState variant="inline" message="Loading yesterday's summary…" />
      </View>
    );
  }

  if (model.kind === "error") {
    return (
      <View style={styles.card} accessibilityLabel="Daily Recap error">
        <DailyRecapHeader showAsOf={false} {...(onViewMore != null ? { onViewMore } : {})} />
        <ErrorState
          variant="inline"
          title="Could not load recap"
          message={model.message}
          requestId={model.requestId}
          onRetry={model.retry}
        />
      </View>
    );
  }

  const dayKey = model.dayKey;
  const rows = model.rows;
  const hint =
    model.kind === "missing_doc"
      ? "No daily rollup for yesterday yet — metrics appear after data syncs."
      : model.kind === "empty"
        ? "No tracked metrics for yesterday in your daily summary."
        : null;

  return (
    <View style={styles.card} accessibilityLabel={`Daily Recap for ${dayKey}`}>
      <DailyRecapHeader showAsOf dayKey={dayKey} {...(onViewMore != null ? { onViewMore } : {})} />
      {hint != null ? <RecapHint>{hint}</RecapHint> : null}
      <View style={moduleOverviewMetricLayoutStyles.metricGroups}>
        {rows.map((r) => (
          <View
            key={r.id}
            style={moduleOverviewMetricLayoutStyles.metricBlock}
            accessibilityLabel={dashRecapRowAccessibilityLabel(r)}
            accessible
          >
            <View style={moduleOverviewMetricLayoutStyles.topRow}>
              <Text style={moduleOverviewMetricLayoutStyles.primaryLabel} numberOfLines={1}>
                {r.label}
              </Text>
              <Text
                style={[
                  moduleOverviewMetricLayoutStyles.trailingValue,
                  r.isPlaceholder ? styles.trailingPlaceholder : null,
                ]}
                numberOfLines={1}
              >
                {r.valueText}
              </Text>
            </View>
            {r.bar.kind === "placement" ? (
              <PlacementTrack markerPosition01={r.bar.markerPosition01} testID={`dash-daily-recap-bar-${r.id}`} />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: UI_DASH_RECAP_CARD_RADIUS,
    padding: 20,
    gap: 12,
  },
  headerRow: {
    alignItems: "flex-start",
  },
  asOfLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6E6E73",
  },
  hint: {
    fontSize: 14,
    color: "#8E8E93",
    lineHeight: 20,
  },
  trailingPlaceholder: {
    color: "#AEAEB2",
  },
});
