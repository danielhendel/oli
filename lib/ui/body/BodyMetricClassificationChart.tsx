import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { BodyMetricClassificationChartModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import {
  BODY_METRIC_CHART_MARKER_FILL,
  BODY_METRIC_CHART_MARKER_TEXT,
  BODY_METRIC_CHART_TRACK_BORDER,
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
  if (model.marker != null) {
    if (!ids.has(model.marker.segmentId)) return "unknown_marker_segment";
  }
  return null;
}

/**
 * Presentation-only categorical classification chart.
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
    marker != null && marker.withinSegmentPosition != null && Number.isFinite(marker.withinSegmentPosition)
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
      {marker != null && markerLeftPct != null ? (
        <View
          pointerEvents="none"
          importantForAccessibility="no"
          accessibilityElementsHidden
          style={[styles.markerColumn, { left: `${markerLeftPct}%` }]}
          testID="body-metric-classification-marker"
        >
          <View style={styles.valueCapsule}>
            <Text style={styles.valueCapsuleText} numberOfLines={1}>
              {marker.formattedValue}
            </Text>
          </View>
          <Text style={styles.markerPointer}>▼</Text>
        </View>
      ) : null}

      <View
        style={styles.track}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
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
                  backgroundColor: chrome.fill,
                  borderRightColor: chrome.divider,
                  borderRightWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                  borderTopLeftRadius: isFirst ? 12 : 0,
                  borderBottomLeftRadius: isFirst ? 12 : 0,
                  borderTopRightRadius: isLast ? 12 : 0,
                  borderBottomRightRadius: isLast ? 12 : 0,
                },
              ]}
            >
              <Text style={[styles.bandLabel, { color: chrome.label }]} numberOfLines={2}>
                {segment.label}
              </Text>
              {segment.formattedRange ? (
                <Text style={[styles.bandRange, { color: chrome.range }]} numberOfLines={2}>
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
    position: "relative",
    paddingTop: 36,
    gap: 0,
  },
  failClosed: {
    height: 0,
  },
  markerColumn: {
    position: "absolute",
    top: 0,
    width: 88,
    marginLeft: -44,
    alignItems: "center",
    zIndex: 2,
  },
  valueCapsule: {
    backgroundColor: BODY_METRIC_CHART_MARKER_FILL,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: 88,
  },
  valueCapsuleText: {
    color: BODY_METRIC_CHART_MARKER_TEXT,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  markerPointer: {
    color: BODY_METRIC_CHART_MARKER_FILL,
    fontSize: 10,
    lineHeight: 12,
    marginTop: -1,
  },
  track: {
    flexDirection: "row",
    minHeight: 72,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BODY_METRIC_CHART_TRACK_BORDER,
  },
  band: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 10,
    justifyContent: "center",
    gap: 4,
    minWidth: 0,
  },
  bandLabel: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  bandRange: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "500",
    textAlign: "center",
  },
});
