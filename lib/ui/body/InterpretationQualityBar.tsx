// lib/ui/body/InterpretationQualityBar.tsx
// Four-zone interpretation track with value marker (Body Composition overview).
import React, { useState } from "react";
import { LayoutChangeEvent, View, StyleSheet } from "react-native";

import type { InterpretationBarModel } from "@/lib/body/bodyOverviewInterpretationBar";

import { clampedDotLeftPx } from "./interpretationBarDotLayout";

const ZONE_BG = ["#DCDCE3", "#D0D0D8", "#C4CEC8", "#B0C9B8"] as const;
const TRACK_RADIUS = 5;
const DOT_SIZE = 10;

export function interpretationBarAccessibilityLabel(bar: InterpretationBarModel, metricLabel: string): string {
  const pct = Math.round(bar.marker01 * 100);
  if (bar.hasValue) {
    return `${metricLabel} interpretation: ${bar.displayLabel}. Marker at ${pct} percent along the quality scale.`;
  }
  return `${metricLabel}: no measurement; interpretation not available.`;
}

export type InterpretationQualityBarProps = {
  bar: InterpretationBarModel;
};

export function InterpretationQualityBar({ bar }: InterpretationQualityBarProps) {
  const [trackW, setTrackW] = useState(0);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - trackW) > 0.5) setTrackW(w);
  };

  const dotLeft =
    bar.hasValue && trackW > 0 ? clampedDotLeftPx(trackW, bar.marker01, DOT_SIZE) : undefined;

  return (
    <View
      style={styles.wrap}
      accessibilityRole="none"
      accessible={false}
      importantForAccessibility="no"
      onLayout={onTrackLayout}
    >
      <View style={styles.zonesClip} importantForAccessibility="no">
        <View style={styles.zonesRow}>
          {ZONE_BG.map((color, i) => (
            <View key={i} style={[styles.zone, { backgroundColor: color }]} />
          ))}
        </View>
      </View>
      {bar.hasValue && dotLeft != null ? (
        <View
          style={[
            styles.dot,
            {
              left: dotLeft,
            },
          ]}
          importantForAccessibility="no"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 10,
    position: "relative",
    justifyContent: "center",
  },
  zonesClip: {
    borderRadius: TRACK_RADIUS,
    overflow: "hidden",
    height: 10,
  },
  zonesRow: {
    flexDirection: "row",
    height: 10,
  },
  zone: { flex: 1, marginHorizontal: StyleSheet.hairlineWidth },
  dot: {
    position: "absolute",
    top: 0,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: "#3A3A3C",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.85)",
  },
});
