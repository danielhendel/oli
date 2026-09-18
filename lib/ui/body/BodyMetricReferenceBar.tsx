import React from "react";
import { StyleSheet, View } from "react-native";

import type { BodyMetricReferenceBarModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_OVERLAY_10 } from "@/lib/ui/theme/systemAccent";

const TONE_COLORS = {
  muted: "rgba(255,255,255,0.12)",
  reference: "rgba(58,91,219,0.45)",
  caution: "rgba(255,255,255,0.22)",
  elevated: "rgba(255,255,255,0.32)",
} as const;

export type BodyMetricReferenceBarProps = {
  model: BodyMetricReferenceBarModel;
  testID?: string;
};

/**
 * Presentation-only reference bar. Does not compute thresholds or classify.
 */
export function BodyMetricReferenceBar(props: BodyMetricReferenceBarProps) {
  const { model } = props;
  const showMarker =
    model.markerPosition != null &&
    Number.isFinite(model.markerPosition) &&
    model.markerPosition >= 0 &&
    model.markerPosition <= 1;

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={model.accessibleSummary}
      testID={props.testID ?? "body-metric-reference-bar"}
      style={styles.wrap}
    >
      <View
        style={styles.track}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {model.segments.map((segment) => {
          const flex = Math.max(0.01, segment.end - segment.start);
          return (
            <View
              key={segment.id}
              style={[styles.segment, { flex, backgroundColor: TONE_COLORS[segment.tone] }]}
            />
          );
        })}
      </View>
      {showMarker ? (
        <View
          pointerEvents="none"
          importantForAccessibility="no"
          accessibilityElementsHidden
          style={[
            styles.marker,
            { left: `${Math.round((model.markerPosition as number) * 1000) / 10}%` },
          ]}
          testID="body-metric-reference-marker"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    paddingTop: 4,
    paddingBottom: 4,
  },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: SYSTEM_ACCENT_OVERLAY_10,
  },
  segment: {
    height: "100%",
  },
  marker: {
    position: "absolute",
    top: 0,
    marginLeft: -1.5,
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: SYSTEM_ACCENT,
  },
});
