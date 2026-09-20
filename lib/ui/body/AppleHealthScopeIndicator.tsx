/**
 * Noninteractive Apple Health sync-scope visual (read-only).
 * Prefer {@link AppleHealthScopeToggle} when the control must change Oli sync scope.
 */

import React from "react";
import { StyleSheet, View } from "react-native";

import { UI_APPLE_HEALTH_TOGGLE_ON } from "@/lib/ui/theme/uiTokens";

export type AppleHealthScopeIndicatorProps = {
  metricLabel: string;
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
          ? `${props.metricLabel} is included in Apple Health sync`
          : `${props.metricLabel} is not included in Apple Health sync`
      }
      testID={props.testID ?? "apple-health-scope-indicator"}
    >
      <View style={[styles.thumb, on ? styles.thumbOn : styles.thumbOff]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 51,
    height: 31,
    borderRadius: 16,
    paddingHorizontal: 2,
    justifyContent: "center",
  },
  trackOn: {
    backgroundColor: UI_APPLE_HEALTH_TOGGLE_ON,
    alignItems: "flex-end",
  },
  trackOff: {
    backgroundColor: "rgba(120,120,128,0.36)",
    alignItems: "flex-start",
  },
  thumb: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: "rgb(255, 255, 255)",
  },
  thumbOn: {},
  thumbOff: {},
});
