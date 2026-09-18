import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { BodyMetricClassificationChartModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import {
  BODY_METRIC_CHART_MARKER_BORDER,
  BODY_METRIC_CHART_MARKER_FILL,
  BODY_METRIC_CHART_MARKER_GLOW,
  BODY_METRIC_CHART_MARKER_TEXT,
  BODY_METRIC_CHART_TRACK_BORDER,
  BODY_METRIC_CHART_TRACK_SHADOW,
  BODY_METRIC_CHART_TRACK_SHEEN,
  BODY_METRIC_SPECTRUM_HEIGHT,
  BODY_METRIC_SPECTRUM_RADIUS,
  resolveBodyMetricClassificationBandChrome,
} from "@/lib/ui/theme/bodyMetricClassificationChrome";

export type BodyMetricClassificationChartProps = {
  model: BodyMetricClassificationChartModel;
  testID?: string;
};

function validateChartModel(model: BodyMetricClassificationChartModel): string | null {
  if (!model.segments || model.segments.length === 0) return "empty";
  const ids = new Set<string>();
  for (const s of model.segments) {
    if (!s.id || !s.label) return "malformed";
    if (ids.has(s.id)) return "duplicate";
    ids.add(s.id);
    if (
      s.lowerBound != null &&
      s.upperBound != null &&
      Number.isFinite(s.lowerBound) &&
      Number.isFinite(s.upperBound) &&
      s.lowerBound > s.upperBound
    ) {
      return "impossible";
    }
  }
  if (model.marker != null && !ids.has(model.marker.segmentId)) {
    return "unknown_marker_segment";
  }
  return null;
}

/**
 * Presentation-only categorical classification chart.
 * Thin luminous spectrum + labels beneath — not color-only.
 * Does not calculate BMI, classify, convert units, or access profile/sources.
 */
export function BodyMetricClassificationChart(props: BodyMetricClassificationChartProps) {
  const { model } = props;
  const invalid = validateChartModel(model);
  if (invalid != null) {
    return (
      <View
        testID={props.testID ?? "body-metric-classification-chart"}
        accessibilityLabel="Classification chart unavailable"
        style={styles.failClosed}
      />
    );
  }

  const segmentCount = model.segments.length;
  const marker = model.marker;
  const markerSegmentIndex =
    marker != null ? model.segments.findIndex((s) => s.id === marker.segmentId) : -1;
  const within =
    marker != null &&
    marker.withinSegmentPosition != null &&
    Number.isFinite(marker.withinSegmentPosition)
      ? Math.max(0, Math.min(1, marker.withinSegmentPosition))
      : 0.42;
  const markerLeftPct =
    markerSegmentIndex >= 0
      ? ((markerSegmentIndex + within) / segmentCount) * 100
      : null;

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={model.accessibleSummary}
      testID={props.testID ?? "body-metric-classification-chart"}
      style={styles.wrap}
    >
      <View style={styles.markerRail} importantForAccessibility="no">
        {marker != null && markerLeftPct != null ? (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            style={[styles.markerColumn, { left: `${markerLeftPct}%` }]}
            testID="body-metric-classification-marker"
          >
            <View style={styles.valueCapsuleOuter}>
              <View style={styles.valueCapsule}>
                <Text style={styles.valueCapsuleText} numberOfLines={1}>
                  {marker.formattedValue}
                </Text>
              </View>
            </View>
            <View style={styles.markerStem} />
            <View style={styles.markerDot} />
          </View>
        ) : null}
      </View>

      <View
        style={styles.trackGlow}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <View style={styles.track}>
          {model.segments.map((segment, index) => {
            const chrome = resolveBodyMetricClassificationBandChrome(segment.tone);
            const isFirst = index === 0;
            const isLast = index === segmentCount - 1;
            return (
              <View
                key={segment.id}
                style={[
                  styles.band,
                  {
                    backgroundColor: chrome.fillStrong,
                    borderRightColor: chrome.divider,
                    borderRightWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                    borderTopLeftRadius: isFirst ? BODY_METRIC_SPECTRUM_RADIUS : 0,
                    borderBottomLeftRadius: isFirst ? BODY_METRIC_SPECTRUM_RADIUS : 0,
                    borderTopRightRadius: isLast ? BODY_METRIC_SPECTRUM_RADIUS : 0,
                    borderBottomRightRadius: isLast ? BODY_METRIC_SPECTRUM_RADIUS : 0,
                  },
                ]}
              >
                <View style={[styles.bandSheen, { backgroundColor: chrome.fillHighlight }]} />
              </View>
            );
          })}
          <View pointerEvents="none" style={styles.trackSheen} />
        </View>
      </View>

      <View
        style={styles.labelRow}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {model.segments.map((segment) => {
          const chrome = resolveBodyMetricClassificationBandChrome(segment.tone);
          return (
            <View key={`label-${segment.id}`} style={styles.labelCell}>
              <Text style={[styles.bandLabel, { color: chrome.label }]} numberOfLines={2}>
                {segment.label}
              </Text>
              {segment.formattedRange ? (
                <Text style={[styles.bandRange, { color: chrome.range }]} numberOfLines={1}>
                  {segment.formattedRange}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  failClosed: {
    height: 0,
  },
  markerRail: {
    height: 40,
    position: "relative",
  },
  markerColumn: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 100,
    marginLeft: -50,
    alignItems: "center",
    zIndex: 3,
  },
  valueCapsuleOuter: {
    borderRadius: 999,
    padding: 2.5,
    backgroundColor: BODY_METRIC_CHART_MARKER_GLOW,
  },
  valueCapsule: {
    backgroundColor: BODY_METRIC_CHART_MARKER_FILL,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 4,
    maxWidth: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BODY_METRIC_CHART_MARKER_BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  valueCapsuleText: {
    color: BODY_METRIC_CHART_MARKER_TEXT,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.15,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  markerStem: {
    width: 1.5,
    flexGrow: 1,
    minHeight: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    marginTop: 2,
  },
  markerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: BODY_METRIC_CHART_MARKER_FILL,
    marginTop: -1,
    shadowColor: "#fff",
    shadowOpacity: 0.55,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  trackGlow: {
    borderRadius: BODY_METRIC_SPECTRUM_RADIUS,
    shadowColor: BODY_METRIC_CHART_TRACK_SHADOW,
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  track: {
    flexDirection: "row",
    height: BODY_METRIC_SPECTRUM_HEIGHT,
    borderRadius: BODY_METRIC_SPECTRUM_RADIUS,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BODY_METRIC_CHART_TRACK_BORDER,
  },
  band: {
    flex: 1,
    height: "100%",
    overflow: "hidden",
  },
  bandSheen: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "48%",
    opacity: 0.85,
  },
  trackSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BODY_METRIC_CHART_TRACK_SHEEN,
    opacity: 0.18,
  },
  labelRow: {
    flexDirection: "row",
    gap: 2,
    paddingHorizontal: 0,
    marginTop: 2,
  },
  labelCell: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    alignItems: "center",
    paddingHorizontal: 1,
  },
  bandLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.15,
  },
  bandRange: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "500",
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    opacity: 0.92,
  },
});
