import React from "react";
import { StyleSheet, View, type DimensionValue } from "react-native";

export type LinearProgressBarProps = {
  /** 0–1; values outside range are clamped. */
  progress: number;
  trackColor: string;
  fillColor: string;
  height?: number;
  borderRadius?: number;
  testID?: string;
};

function clamp01(x: number): number {
  if (!Number.isFinite(x) || x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

/**
 * Simple horizontal progress (filled width), shared by overview cards and similar rows.
 */
export function LinearProgressBar({
  progress,
  trackColor,
  fillColor,
  height = 8,
  borderRadius = 999,
  testID,
}: LinearProgressBarProps) {
  const p = clamp01(progress);
  const widthPct = `${Math.round(p * 100)}%` as DimensionValue;

  return (
    <View
      style={[styles.track, { height, borderRadius, backgroundColor: trackColor }]}
      testID={testID}
    >
      <View style={[styles.fill, { width: widthPct, borderRadius, backgroundColor: fillColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});
