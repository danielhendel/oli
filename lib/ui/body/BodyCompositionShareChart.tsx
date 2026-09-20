import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { BodyCompositionShareGraphModel } from "@/lib/body/presentation/bodyCompositionShareGraphTypes";
import {
  BODY_METRIC_CHART_MARKER_BORDER,
  BODY_METRIC_CHART_MARKER_FILL,
  BODY_METRIC_CHART_MARKER_GLOW,
  BODY_METRIC_CHART_MARKER_TEXT,
  BODY_METRIC_CHART_TRACK_BORDER,
  BODY_METRIC_CHART_TRACK_SHADOW,
  BODY_METRIC_SPECTRUM_HEIGHT,
  BODY_METRIC_SPECTRUM_RADIUS,
} from "@/lib/ui/theme/bodyMetricClassificationChrome";
import { UI_TEXT_MUTED } from "@/lib/ui/theme/uiTokens";

export type BodyCompositionShareChartProps = {
  model: BodyCompositionShareGraphModel;
  testID?: string;
};

/** Body Fat: restrained warm coral/rose. Lean Mass: restrained teal/cyan. */
const ACCENT = {
  bodyFat: {
    fill: "rgba(244, 140, 140, 0.78)",
    highlight: "rgba(254, 205, 211, 0.45)",
  },
  leanMass: {
    fill: "rgba(45, 212, 191, 0.72)",
    highlight: "rgba(153, 246, 228, 0.42)",
  },
} as const;

const REMAINDER_FILL = "rgba(100, 116, 139, 0.38)";
const REMAINDER_HIGHLIGHT = "rgba(226, 232, 240, 0.18)";

/**
 * Measurement-proportion share rail — not a classification spectrum.
 * Single accent fill + neutral remainder; marker is quantity only.
 */
export function BodyCompositionShareChart(props: BodyCompositionShareChartProps) {
  const { model } = props;
  const accent = ACCENT[model.metric];
  const position =
    model.normalizedPosition != null && Number.isFinite(model.normalizedPosition)
      ? Math.max(0, Math.min(1, model.normalizedPosition))
      : null;
  const showMarker = position != null && model.valueLabel != null;
  const fillPct = position != null ? position * 100 : 0;

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={model.accessibleSummary}
      testID={props.testID ?? "body-composition-share-chart"}
      style={styles.wrap}
    >
      <View style={styles.markerRail} importantForAccessibility="no">
        {showMarker ? (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            style={[styles.markerColumn, { left: `${fillPct}%` }]}
            testID="body-composition-share-marker"
          >
            <View style={styles.valueCapsuleOuter}>
              <View style={styles.valueCapsule}>
                <Text style={styles.valueCapsuleText} numberOfLines={1}>
                  {model.valueLabel}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      <View
        style={styles.trackGlow}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        testID="body-composition-share-track"
      >
        <View style={styles.track}>
          {position != null ? (
            <>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${fillPct}%`,
                    backgroundColor: accent.fill,
                  },
                ]}
                testID="body-composition-share-fill"
              >
                <View style={[styles.bandSheen, { backgroundColor: accent.highlight }]} />
              </View>
              <View
                style={[
                  styles.remainder,
                  {
                    width: `${100 - fillPct}%`,
                    backgroundColor: REMAINDER_FILL,
                  },
                ]}
                testID="body-composition-share-remainder"
              >
                <View style={[styles.bandSheen, { backgroundColor: REMAINDER_HIGHLIGHT }]} />
              </View>
            </>
          ) : (
            <View
              style={[styles.remainder, { width: "100%", backgroundColor: REMAINDER_FILL }]}
              testID="body-composition-share-neutral"
            >
              <View style={[styles.bandSheen, { backgroundColor: REMAINDER_HIGHLIGHT }]} />
            </View>
          )}
        </View>
      </View>

      <Text style={styles.caption} testID="body-composition-share-caption">
        {model.caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  markerRail: {
    height: 40,
    position: "relative",
  },
  markerColumn: {
    position: "absolute",
    top: 0,
    width: 1,
    alignItems: "center",
  },
  valueCapsuleOuter: {
    position: "absolute",
    bottom: 0,
    transform: [{ translateX: -28 }],
    shadowColor: BODY_METRIC_CHART_MARKER_GLOW,
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  valueCapsule: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: BODY_METRIC_CHART_MARKER_FILL,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BODY_METRIC_CHART_MARKER_BORDER,
    alignItems: "center",
  },
  valueCapsuleText: {
    color: BODY_METRIC_CHART_MARKER_TEXT,
    fontSize: 12,
    fontWeight: "700",
  },
  trackGlow: {
    borderRadius: BODY_METRIC_SPECTRUM_RADIUS,
    shadowColor: BODY_METRIC_CHART_TRACK_SHADOW,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  track: {
    flexDirection: "row",
    height: BODY_METRIC_SPECTRUM_HEIGHT,
    borderRadius: BODY_METRIC_SPECTRUM_RADIUS,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BODY_METRIC_CHART_TRACK_BORDER,
  },
  fill: {
    height: "100%",
    overflow: "hidden",
  },
  remainder: {
    height: "100%",
    overflow: "hidden",
  },
  bandSheen: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "48%",
    opacity: 0.55,
  },
  caption: {
    color: UI_TEXT_MUTED,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 2,
  },
});
