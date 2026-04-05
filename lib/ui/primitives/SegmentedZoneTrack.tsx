import React, { useState } from "react";
import { LayoutChangeEvent, StyleSheet, View, type ViewProps } from "react-native";

import { clampedDotLeftPx } from "@/lib/ui/body/interpretationBarDotLayout";
import { MODULE_OVERVIEW_SEGMENTED_TRACK } from "@/lib/ui/overview/moduleOverviewSegmentedTrackMetrics";

const DEFAULT_DOT_SIZE = MODULE_OVERVIEW_SEGMENTED_TRACK.dotSize;
const DEFAULT_BAR_HEIGHT = MODULE_OVERVIEW_SEGMENTED_TRACK.barHeight;
const DEFAULT_TRACK_RADIUS = MODULE_OVERVIEW_SEGMENTED_TRACK.trackRadius;

function clamp01(x: number): number {
  if (!Number.isFinite(x) || x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

export type SegmentedZoneTrackProps = {
  zoneColors: readonly string[];
  testID?: string;
  /** Clamped 0–1 along full track width. */
  markerPosition01: number;
  /** When false, zones render but no marker (e.g. Body with no measurement). */
  showMarker: boolean;
  markerBackgroundColor: string;
  dotSize?: number;
  barHeight?: number;
  trackRadius?: number;
  /** Applied to the outer wrapper (layout + testID are owned by this component). */
  wrapperProps?: Omit<ViewProps, "children" | "onLayout" | "testID" | "style"> & {
    style?: ViewProps["style"];
  };
};

/**
 * Shared layout for multi-segment quality / consistency tracks with an optional position marker.
 * Domain colors, accessibility, and semantics stay at call sites.
 */
export function SegmentedZoneTrack({
  zoneColors,
  testID,
  markerPosition01,
  showMarker,
  markerBackgroundColor,
  dotSize = DEFAULT_DOT_SIZE,
  barHeight = DEFAULT_BAR_HEIGHT,
  trackRadius = DEFAULT_TRACK_RADIUS,
  wrapperProps,
}: SegmentedZoneTrackProps) {
  const [trackW, setTrackW] = useState(0);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - trackW) > 0.5) setTrackW(w);
  };

  const marker01 = clamp01(markerPosition01);

  const dotLeft =
    showMarker && trackW > 0 ? clampedDotLeftPx(trackW, marker01, dotSize) : undefined;

  const zonesTestID = testID != null ? `${testID}-zones` : undefined;
  const markerTestID = testID != null ? `${testID}-marker` : undefined;
  const { style: wrapperStyle, ...wrapperRest } = wrapperProps ?? {};

  return (
    <View
      {...wrapperRest}
      {...(testID != null ? { testID } : {})}
      style={[styles.trackWrap, { height: barHeight }, wrapperStyle]}
      onLayout={onTrackLayout}
    >
      <View
        style={[styles.zonesClip, { borderRadius: trackRadius, height: barHeight }]}
        {...(zonesTestID != null ? { testID: zonesTestID } : {})}
        importantForAccessibility="no"
      >
        <View style={[styles.zonesRow, { height: barHeight }]} importantForAccessibility="no">
          {zoneColors.map((color, i) => (
            <View
              key={i}
              style={[styles.zone, { backgroundColor: color }]}
              importantForAccessibility="no"
            />
          ))}
        </View>
      </View>
      {dotLeft != null ? (
        <View
          style={[
            styles.markerDot,
            {
              left: dotLeft,
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: markerBackgroundColor,
            },
          ]}
          importantForAccessibility="no"
          {...(markerTestID != null ? { testID: markerTestID } : {})}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  trackWrap: {
    width: "100%",
    position: "relative",
    justifyContent: "center",
  },
  zonesClip: {
    overflow: "hidden",
  },
  zonesRow: {
    flexDirection: "row",
  },
  zone: {
    flex: 1,
    marginHorizontal: StyleSheet.hairlineWidth,
  },
  markerDot: {
    position: "absolute",
    top: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.85)",
  },
});
