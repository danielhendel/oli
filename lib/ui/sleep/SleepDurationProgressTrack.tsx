import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { SLEEP_METRIC_TRACK_COLOR } from "@/lib/ui/recovery/getSleepMetricColor";
import { MODULE_OVERVIEW_SEGMENTED_TRACK } from "@/lib/ui/overview/moduleOverviewSegmentedTrackMetrics";

const BAR_HEIGHT = MODULE_OVERVIEW_SEGMENTED_TRACK.barHeight;
const TRACK_RADIUS = MODULE_OVERVIEW_SEGMENTED_TRACK.trackRadius;

export type SleepDurationProgressTrackProps = {
  testID?: string;
  fill01: number | null;
  fillColor: string;
  wrapperProps?: Omit<ViewProps, "children" | "testID">;
};

export function SleepDurationProgressTrack({
  testID,
  fill01,
  fillColor,
  wrapperProps,
}: SleepDurationProgressTrackProps) {
  const widthPct = fill01 != null && Number.isFinite(fill01) ? Math.min(1, Math.max(0, fill01)) : 0;
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
            backgroundColor: fillColor,
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
    backgroundColor: SLEEP_METRIC_TRACK_COLOR,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    height: BAR_HEIGHT,
    borderRadius: TRACK_RADIUS,
  },
});
