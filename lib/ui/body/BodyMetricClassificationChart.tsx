import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { BodyMetricClassificationChartModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import {
  BODY_METRIC_CHART_MARKER_FILL,
  BODY_METRIC_CHART_MARKER_GLOW,
  BODY_METRIC_CHART_MARKER_TEXT,
  BODY_METRIC_CHART_TRACK_BORDER,
  BODY_METRIC_CHART_TRACK_INNER,
  resolveBodyMetricClassificationBandChrome,
} from "@/lib/ui/theme/bodyMetricClassificationChrome";
import { UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

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
 * Spectrum bar teaches visually; labels + ranges sit beneath (not color-only).
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
            <View style={styles.valueCapsuleGlow}>
              <View style={styles.valueCapsule}>
                <Text style={styles.valueCapsuleText} numberOfLines={1}>
                  {marker.formattedValue}
                </Text>
              </View>
            </View>
            <View style={styles.markerStem} />
          </View>
        ) : null}
      </View>

      <View
        style={styles.trackShell}
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
                    borderRightWidth: isLast ? 0 : 1,
                    borderTopLeftRadius: isFirst ? 10 : 0,
                    borderBottomLeftRadius: isFirst ? 10 : 0,
                    borderTopRightRadius: isLast ? 10 : 0,
                    borderBottomRightRadius: isLast ? 10 : 0,
                  },
                ]}
              />
            );
          })}
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
                <Text style={styles.bandRange} numberOfLines={2}>
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
    gap: 10,
  },
  failClosed: {
    height: 0,
  },
  markerRail: {
    height: 44,
    position: "relative",
  },
  markerColumn: {
    position: "absolute",
    top: 0,
    width: 96,
    marginLeft: -48,
    alignItems: "center",
    zIndex: 3,
  },
  valueCapsuleGlow: {
    borderRadius: 999,
    padding: 2,
    backgroundColor: BODY_METRIC_CHART_MARKER_GLOW,
  },
  valueCapsule: {
    backgroundColor: BODY_METRIC_CHART_MARKER_FILL,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    maxWidth: 92,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  valueCapsuleText: {
    color: BODY_METRIC_CHART_MARKER_TEXT,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.2,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  markerStem: {
    width: 3,
    flex: 1,
    minHeight: 12,
    borderRadius: 2,
    backgroundColor: BODY_METRIC_CHART_MARKER_FILL,
    marginTop: 2,
  },
  trackShell: {
    borderRadius: 12,
    padding: 3,
    backgroundColor: BODY_METRIC_CHART_TRACK_INNER,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BODY_METRIC_CHART_TRACK_BORDER,
  },
  track: {
    flexDirection: "row",
    height: 28,
    borderRadius: 10,
    overflow: "hidden",
  },
  band: {
    flex: 1,
    height: "100%",
  },
  labelRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 2,
  },
  labelCell: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    alignItems: "center",
  },
  bandLabel: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.1,
  },
  bandRange: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "600",
    textAlign: "center",
    color: UI_TEXT_SECONDARY,
    fontVariant: ["tabular-nums"],
  },
});
