import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { MODULE_OVERVIEW_SEGMENTED_TRACK } from "@/lib/ui/overview/moduleOverviewSegmentedTrackMetrics";

/**
 * Neutral track color shared with Sleep Baseline (`SLEEP_METRIC_TRACK_COLOR`) so visual rhythm
 * between Energy Baseline rows and Sleep Baseline rows is identical. Inlined as a local
 * constant to avoid coupling the energy module to recovery semantics.
 */
export const ENERGY_BASELINE_TRACK_COLOR = "#E5E5EA";

/**
 * Accent fill — same blue used by {@link EnergyWeeklyRangeBars} so progress bars on the
 * Daily Energy page read as one visual system.
 */
export const ENERGY_BASELINE_FILL_COLOR = "#4F7CFF";

const BAR_HEIGHT = MODULE_OVERVIEW_SEGMENTED_TRACK.barHeight;
const TRACK_RADIUS = MODULE_OVERVIEW_SEGMENTED_TRACK.trackRadius;

export type EnergyBaselineProgressTrackProps = {
  testID?: string;
  fill01: number | null;
  wrapperProps?: Omit<ViewProps, "children" | "testID">;
};

/**
 * Progress track for Energy Baseline rows. Mirrors {@link SleepDurationProgressTrack} geometry
 * (height/radius from {@link MODULE_OVERVIEW_SEGMENTED_TRACK}) so rows align with Sleep Baseline.
 */
export function EnergyBaselineProgressTrack({
  testID,
  fill01,
  wrapperProps,
}: EnergyBaselineProgressTrackProps) {
  const widthPct =
    fill01 != null && Number.isFinite(fill01) ? Math.min(1, Math.max(0, fill01)) : 0;
  const pct = Math.round(widthPct * 100);

  return (
    <View
      {...wrapperProps}
      testID={testID}
      style={[styles.track, wrapperProps?.style]}
      accessibilityRole={wrapperProps?.accessibilityRole ?? "progressbar"}
      accessibilityValue={wrapperProps?.accessibilityValue ?? { now: pct, min: 0, max: 100 }}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${widthPct * 100}%`,
            backgroundColor: ENERGY_BASELINE_FILL_COLOR,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: BAR_HEIGHT,
    borderRadius: TRACK_RADIUS,
    backgroundColor: ENERGY_BASELINE_TRACK_COLOR,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    height: BAR_HEIGHT,
    borderRadius: TRACK_RADIUS,
  },
});
