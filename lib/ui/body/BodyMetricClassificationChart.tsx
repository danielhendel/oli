import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { BodyMetricClassificationChartModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import {
  BodyChartPositionMarker,
  BODY_CHART_MARKER_RAIL_HEIGHT,
} from "@/lib/ui/body/BodyChartPositionMarker";
import {
  BODY_METRIC_CHART_TRACK_BORDER,
  BODY_METRIC_CHART_TRACK_SHADOW,
  BODY_METRIC_CHART_TRACK_SHEEN,
  BODY_METRIC_SPECTRUM_HEIGHT,
  BODY_METRIC_SPECTRUM_RADIUS,
  resolveBodyMetricClassificationBandChrome,
  resolveWeightClassificationBandPaint,
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
 * Presentation-only categorical classification / educational-reference chart.
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
  const activeSegment =
    markerSegmentIndex >= 0 ? model.segments[markerSegmentIndex] : null;
  const markerCenterFill =
    activeSegment != null
      ? resolveBodyMetricClassificationBandChrome(activeSegment.tone).fillStrong
      : null;
  const isValuePosition = marker?.kind === "value_position";

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={model.accessibleSummary}
      testID={props.testID ?? "body-metric-classification-chart"}
      style={styles.wrap}
    >
      <View style={styles.markerRail} importantForAccessibility="no">
        {marker != null && markerLeftPct != null && markerCenterFill != null ? (
          <BodyChartPositionMarker
            leftPercent={markerLeftPct}
            centerFill={markerCenterFill}
            testID="body-metric-classification-marker"
            knobTestID={
              isValuePosition
                ? "body-metric-classification-marker-value-position"
                : "body-metric-classification-marker-classification"
            }
          />
        ) : null}
      </View>

      <View
        style={styles.trackGlow}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <View style={styles.track}>
          {model.segments.map((segment, index) => {
            const paint = resolveWeightClassificationBandPaint(segment.tone);
            const isFirst = index === 0;
            const isLast = index === segmentCount - 1;
            return (
              <View
                key={segment.id}
                style={[
                  styles.band,
                  {
                    backgroundColor: paint.fillStrong,
                    borderRightColor: paint.divider,
                    borderRightWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                    borderTopLeftRadius: isFirst ? BODY_METRIC_SPECTRUM_RADIUS : 0,
                    borderBottomLeftRadius: isFirst ? BODY_METRIC_SPECTRUM_RADIUS : 0,
                    borderTopRightRadius: isLast ? BODY_METRIC_SPECTRUM_RADIUS : 0,
                    borderBottomRightRadius: isLast ? BODY_METRIC_SPECTRUM_RADIUS : 0,
                  },
                ]}
              >
                <View style={[styles.bandSheen, { backgroundColor: paint.fillHighlight }]} />
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
    gap: 8,
  },
  failClosed: {
    height: 0,
  },
  markerRail: {
    height: BODY_CHART_MARKER_RAIL_HEIGHT,
    position: "relative",
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
    gap: 2,
    alignItems: "center",
    paddingHorizontal: 1,
  },
  bandLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.05,
  },
  bandRange: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "500",
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
});
