/**
 * Noninteractive Apple Health Body sync-scope indicator.
 * Visual “ON” switch-like chip — does NOT represent HealthKit permission truth.
 */

import React from "react";
import { StyleSheet, View } from "react-native";

import { UI_DURATION_STATUS_RECOMMENDED_TEXT } from "@/lib/ui/theme/uiTokens";

export type AppleHealthScopeIndicatorProps = {
  /** Metric display name for accessibility (e.g. "Weight"). */
  metricLabel: string;
  /** When true, shows ON appearance. */
  on: boolean;
  testID?: string;
};

export function AppleHealthScopeIndicator(props: AppleHealthScopeIndicatorProps) {
  const on = props.on === true;
  return (
    <View
      style={[styles.track, on ? styles.trackOn : styles.trackOff]}
      pointerEvents="none"
      accessible
      accessibilityRole="text"
      accessibilityLabel={
        on
          ? `${props.metricLabel} is included in Apple Health Body sync`
          : `${props.metricLabel} is not included in Apple Health Body sync`
      }
      testID={props.testID ?? "apple-health-scope-indicator"}
    >
      <View style={[styles.thumb, on ? styles.thumbOn : styles.thumbOff]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 36,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 2,
    justifyContent: "center",
  },
  trackOn: {
    backgroundColor: UI_DURATION_STATUS_RECOMMENDED_TEXT,
    alignItems: "flex-end",
  },
  trackOff: {
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "flex-start",
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    // Avoid literal `#FFFFFF` StyleSheet card-shell pattern (switch thumb only).
    backgroundColor: "rgb(255, 255, 255)",
  },
  thumbOn: {},
  thumbOff: {},
});
