import React from "react";
import { StyleSheet, View } from "react-native";

import { ACTIVITY_STRIP_ACCENT, ACTIVITY_STRIP_ACCENT_LIGHT } from "@/lib/ui/activity/activityOverviewTheme";

const STROKE_WIDTH = 1.75;
const STROKE_WIDTH_EMPHASIZED = 2.75;

export type ActivityDayRingProps = {
  size: number;
  hasSteps: boolean;
  emphasized?: boolean;
  outerTestID?: string;
};

/** Ring when persisted daily rollup reports steps for that day (Activity overview map). */
export function ActivityDayRing({ size, hasSteps, emphasized = false, outerTestID }: ActivityDayRingProps) {
  if (!hasSteps) return null;
  const strokeWidth = emphasized ? STROKE_WIDTH_EMPHASIZED : STROKE_WIDTH;
  return (
    <View style={[styles.host, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        pointerEvents="none"
        style={[
          styles.fillDisk,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: ACTIVITY_STRIP_ACCENT_LIGHT,
          },
        ]}
      />
      <View
        testID={outerTestID}
        pointerEvents="none"
        style={[
          styles.ringLayer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: ACTIVITY_STRIP_ACCENT,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  fillDisk: {
    ...StyleSheet.absoluteFillObject,
  },
  ringLayer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
