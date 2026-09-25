import React from "react";
import { StyleSheet, View } from "react-native";

import {
  BODY_METRIC_CHART_MARKER_BORDER,
  BODY_METRIC_CHART_MARKER_GLOW,
} from "@/lib/ui/theme/bodyMetricClassificationChrome";

export type BodyChartPositionMarkerProps = {
  /** Horizontal position as percent of the rail width (0–100). */
  readonly leftPercent: number;
  /** Center fill matching the active range / share color. */
  readonly centerFill: string;
  readonly testID?: string;
  /** Optional knob testID for metric-specific assertions. */
  readonly knobTestID?: string;
};

/**
 * Unified current-value indicator for Body landing charts.
 * Same shape / stem / tip across Weight, Body Fat, and Lean Mass.
 * Center fill is supplied by the active range or share accent — never color-only meaning.
 */
export function BodyChartPositionMarker(props: BodyChartPositionMarkerProps) {
  const left = Math.max(0, Math.min(100, props.leftPercent));
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.column, { left: `${left}%` }]}
      testID={props.testID ?? "body-chart-position-marker"}
    >
      <View style={styles.knobOuter}>
        <View
          style={[styles.knob, { backgroundColor: props.centerFill }]}
          testID={props.knobTestID ?? "body-chart-position-marker-knob"}
        />
      </View>
      <View style={styles.stem} />
      <View style={[styles.dot, { backgroundColor: props.centerFill }]} />
    </View>
  );
}

/** Shared marker rail height — keep identical across classification + share charts. */
export const BODY_CHART_MARKER_RAIL_HEIGHT = 22;

const styles = StyleSheet.create({
  column: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 100,
    marginLeft: -50,
    alignItems: "center",
    zIndex: 3,
  },
  knobOuter: {
    borderRadius: 999,
    padding: 2,
    backgroundColor: BODY_METRIC_CHART_MARKER_GLOW,
  },
  knob: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BODY_METRIC_CHART_MARKER_BORDER,
  },
  stem: {
    width: 1.5,
    flexGrow: 1,
    minHeight: 6,
    backgroundColor: "rgba(255,255,255,0.90)",
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: -1,
    shadowColor: "#fff",
    shadowOpacity: 0.45,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
  },
});
