/**
 * Accessible lab trend chart — render + scrub only.
 * Metric-standard overlay geometry is passed in from pure builders.
 * Does not fetch, classify, or invent clinical advice.
 */

import React, { useCallback, useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";

import { buildLabChartDomainWithReference } from "@/lib/labs/history/buildLabChartDomainWithReference";
import { buildLabTrendAccessibilitySummary } from "@/lib/labs/history/buildLabTrendAccessibilitySummary";
import {
  formatLabTrendAxisLabel,
  formatLabTrendPointDate,
} from "@/lib/labs/history/labTrendCalendar";
import type { LabChartReferenceOverlay } from "@/lib/labs/history/labReferenceOverlayTypes";
import {
  mapChartXToEpochMs,
  selectNearestLabTrendPoint,
} from "@/lib/labs/history/selectNearestLabTrendPoint";
import type { LabTrendPoint, LabTrendSeries } from "@/lib/labs/history/labTrendTypes";
import {
  formatLabMetricStandardLines,
} from "@/lib/labs/standard/formatLabMetricStandardCopy";
import type { LabMetricStandardDefinition } from "@/lib/labs/standard/labMetricStandardTypes";
import { monotonePathD } from "@/lib/ui/body/monotoneLinePath";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_RECOMMENDED_RANGE_BORDER,
  UI_RECOMMENDED_RANGE_FILL,
  UI_REFERENCE_ZONE_NEUTRAL_FILL_SOFT,
} from "@/lib/ui/theme/recommendedRangeChrome";
import {
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

const CHART_HEIGHT = 168;
const PAD = { left: 12, right: 12, top: 16, bottom: 28 } as const;
const LINE_WIDTH = 2.25;
const DOT_R = 4.5;
const SELECTED_R = 6.5;
/** In-standard zone: green recommended-range token (clear on dark cards). */
const STANDARD_IN_FILL = UI_RECOMMENDED_RANGE_FILL;
/** Outside-standard zone: muted slate so green remains primary. */
const STANDARD_OUT_FILL = UI_REFERENCE_ZONE_NEUTRAL_FILL_SOFT;
const STANDARD_THRESHOLD_STROKE = UI_RECOMMENDED_RANGE_BORDER;
const STANDARD_THRESHOLD_WIDTH = 1.75;
const NONE_OVERLAY: LabChartReferenceOverlay = {
  kind: "none",
  reason: "missing_reference",
};

export type LabTrendChartProps = {
  series: LabTrendSeries;
  /** Geometry from buildLabMetricStandardOverlay (preferred). */
  standardOverlay?: LabChartReferenceOverlay | null;
  /** @deprecated Prefer standardOverlay — kept for transitional callers. */
  referenceOverlay?: LabChartReferenceOverlay | null;
  metricStandard?: LabMetricStandardDefinition | null;
  selectedPointId?: string | null;
  onSelectPoint?: (point: LabTrendPoint | null) => void;
  testID?: string;
};

function formatSelectedValue(point: LabTrendPoint): string {
  if (point.unit && point.unit !== "none") {
    return `${point.value} ${point.unit}`;
  }
  return String(point.value);
}

function standardContextLines(
  point: LabTrendPoint,
  standard: LabMetricStandardDefinition | null | undefined,
): string[] {
  return formatLabMetricStandardLines({ value: point.value, standard: standard ?? null });
}

function valueToY(
  value: number,
  domain: { yMin: number; yMax: number },
  plotH: number,
): number {
  const yRange = Math.max(0.0001, domain.yMax - domain.yMin);
  return PAD.top + plotH - ((value - domain.yMin) / yRange) * plotH;
}

function clampY(y: number, plotTop: number, plotBottom: number): number {
  return Math.min(plotBottom, Math.max(plotTop, y));
}

/** Exported for render-path tests — maps overlay to concrete SVG geometry. */
export function buildLabTrendReferenceOverlayGeometry(args: {
  overlay: LabChartReferenceOverlay;
  domain: { yMin: number; yMax: number };
  plotW: number;
  plotH: number;
}): {
  within: { y: number; height: number } | null;
  outsideHigh: { y: number; height: number } | null;
  outsideLow: { y: number; height: number } | null;
  thresholds: number[];
} | null {
  const { overlay, domain, plotW, plotH } = args;
  if (overlay.kind === "none" || overlay.kind === "provider_categories") return null;
  if (plotW <= 0 || plotH <= 0) return null;

  const plotTop = PAD.top;
  const plotBottom = PAD.top + plotH;
  const yAt = (v: number) => clampY(valueToY(v, domain, plotH), plotTop, plotBottom);

  if (overlay.kind === "upper_bound") {
    const yThresh = yAt(overlay.upper);
    return {
      outsideHigh: { y: plotTop, height: Math.max(0, yThresh - plotTop) },
      within: { y: yThresh, height: Math.max(0, plotBottom - yThresh) },
      outsideLow: null,
      thresholds: [yThresh],
    };
  }

  if (overlay.kind === "lower_bound") {
    const yThresh = yAt(overlay.lower);
    return {
      within: { y: plotTop, height: Math.max(0, yThresh - plotTop) },
      outsideLow: { y: yThresh, height: Math.max(0, plotBottom - yThresh) },
      outsideHigh: null,
      thresholds: [yThresh],
    };
  }

  const yUpper = yAt(overlay.upper);
  const yLower = yAt(overlay.lower);
  const bandTop = Math.min(yUpper, yLower);
  const bandBottom = Math.max(yUpper, yLower);
  return {
    outsideHigh: { y: plotTop, height: Math.max(0, bandTop - plotTop) },
    within: { y: bandTop, height: Math.max(0, bandBottom - bandTop) },
    outsideLow: { y: bandBottom, height: Math.max(0, plotBottom - bandBottom) },
    thresholds: [yUpper, yLower],
  };
}

function StandardOverlayLayer({
  overlay,
  domain,
  plotW,
  plotH,
}: {
  overlay: LabChartReferenceOverlay;
  domain: { yMin: number; yMax: number };
  plotW: number;
  plotH: number;
}) {
  const geo = buildLabTrendReferenceOverlayGeometry({ overlay, domain, plotW, plotH });
  if (!geo) return null;

  const x = PAD.left;
  const w = plotW;
  const outsideHighTestId =
    overlay.kind === "upper_bound" ? "lab-trend-ref-outside" : "lab-trend-ref-outside-high";
  const outsideLowTestId =
    overlay.kind === "lower_bound" ? "lab-trend-ref-outside" : "lab-trend-ref-outside-low";

  return (
    <G testID="lab-trend-ref-overlay">
      {geo.outsideHigh && geo.outsideHigh.height > 0 ? (
        <Rect
          x={x}
          y={geo.outsideHigh.y}
          width={w}
          height={geo.outsideHigh.height}
          fill={STANDARD_OUT_FILL}
          testID={outsideHighTestId}
        />
      ) : null}
      {geo.within && geo.within.height > 0 ? (
        <Rect
          x={x}
          y={geo.within.y}
          width={w}
          height={geo.within.height}
          fill={STANDARD_IN_FILL}
          testID="lab-trend-ref-within"
        />
      ) : null}
      {geo.outsideLow && geo.outsideLow.height > 0 ? (
        <Rect
          x={x}
          y={geo.outsideLow.y}
          width={w}
          height={geo.outsideLow.height}
          fill={STANDARD_OUT_FILL}
          testID={outsideLowTestId}
        />
      ) : null}
      {geo.thresholds.map((yThresh, idx) => (
        <Line
          key={`thresh-${idx}`}
          x1={x}
          x2={x + w}
          y1={yThresh}
          y2={yThresh}
          stroke={STANDARD_THRESHOLD_STROKE}
          strokeWidth={STANDARD_THRESHOLD_WIDTH}
          testID={
            geo.thresholds.length === 1
              ? "lab-trend-ref-threshold"
              : idx === 0
                ? "lab-trend-ref-threshold-upper"
                : "lab-trend-ref-threshold-lower"
          }
        />
      ))}
    </G>
  );
}

export function LabTrendChart({
  series,
  standardOverlay = null,
  referenceOverlay = null,
  metricStandard = null,
  selectedPointId = null,
  onSelectPoint,
  testID = "lab-trend-chart",
}: LabTrendChartProps) {
  const [width, setWidth] = useState(0);
  const [scrubId, setScrubId] = useState<string | null>(null);

  const overlay = standardOverlay ?? referenceOverlay ?? NONE_OVERLAY;

  const accessibilityLabel = useMemo(
    () =>
      buildLabTrendAccessibilitySummary(series, {
        referenceOverlay: overlay,
        metricStandard,
      }),
    [series, overlay, metricStandard],
  );

  const activeId = scrubId ?? selectedPointId ?? series.latest?.acceptedResultId ?? null;
  const activePoint =
    series.points.find((p) => p.acceptedResultId === activeId) ?? series.latest;

  const geometry = useMemo(() => {
    const domain = buildLabChartDomainWithReference(series.points, overlay);
    if (!domain || width <= 0 || series.points.length < 2) return null;

    const plotW = Math.max(1, width - PAD.left - PAD.right);
    const plotH = Math.max(1, CHART_HEIGHT - PAD.top - PAD.bottom);
    const xRange = Math.max(1, domain.xMaxMs - domain.xMinMs);
    const yRange = Math.max(0.0001, domain.yMax - domain.yMin);

    const coords = series.points.map((p) => {
      const x =
        PAD.left + ((p.epochMs! - domain.xMinMs) / xRange) * plotW;
      const y = PAD.top + plotH - ((p.value - domain.yMin) / yRange) * plotH;
      return { point: p, x, y };
    });

    const pathD = monotonePathD(coords.map((c) => ({ x: c.x, y: c.y })));
    const first = coords[0]!;
    const last = coords[coords.length - 1]!;
    const mid =
      coords.length >= 3 ? coords[Math.floor(coords.length / 2)]! : null;

    return { domain, coords, pathD, plotW, plotH, first, last, mid };
  }, [series.points, width, overlay]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next > 0 && next !== width) setWidth(next);
  }, [width]);

  const handleTouch = useCallback(
    (locationX: number) => {
      if (!geometry) return;
      const target = mapChartXToEpochMs({
        locationX,
        plotLeft: PAD.left,
        plotWidth: geometry.plotW,
        xMinMs: geometry.domain.xMinMs,
        xMaxMs: geometry.domain.xMaxMs,
      });
      if (target == null) return;
      const nearest = selectNearestLabTrendPoint({
        points: series.points,
        targetEpochMs: target,
      });
      if (!nearest) return;
      setScrubId(nearest.acceptedResultId);
      onSelectPoint?.(nearest);
    },
    [geometry, onSelectPoint, series.points],
  );

  if (series.graphEligibility === "single_numeric_point" && series.latest) {
    const p = series.latest;
    return (
      <View
        style={styles.singleWrap}
        testID={`${testID}-single`}
        accessible
        accessibilityLabel={accessibilityLabel}
      >
        <Text style={styles.singleTitle}>One result so far</Text>
        <Text style={styles.singleDate}>{formatLabTrendPointDate(p.collectedDate)}</Text>
        <Text style={styles.singleValue} testID={`${testID}-single-value`}>
          {formatSelectedValue(p)}
        </Text>
        {standardContextLines(p, metricStandard).map((line) => (
          <Text key={line} style={styles.selectionMeta} testID={`${testID}-standard-context`}>
            {line}
          </Text>
        ))}
        <Text style={styles.singleHint}>
          Your trend will appear after another compatible result is added.
        </Text>
      </View>
    );
  }

  if (series.graphEligibility !== "numeric_graph" || series.points.length < 2) {
    return null;
  }

  return (
    <View
      style={styles.wrap}
      testID={testID}
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {activePoint ? (
        <View style={styles.selection} testID={`${testID}-selection`}>
          <Text style={styles.selectionDate}>
            {formatLabTrendPointDate(activePoint.collectedDate)}
          </Text>
          <Text style={styles.selectionValue}>{formatSelectedValue(activePoint)}</Text>
          {standardContextLines(activePoint, metricStandard).map((line) => (
            <Text key={line} style={styles.selectionMeta} testID={`${testID}-standard-context`}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      <View
        style={styles.chartTouch}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => handleTouch(e.nativeEvent.locationX)}
        onResponderMove={(e) => handleTouch(e.nativeEvent.locationX)}
        onResponderRelease={() => {
          setScrubId(null);
          onSelectPoint?.(null);
        }}
        testID={`${testID}-touch`}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {width > 0 && geometry ? (
          <Svg width={width} height={CHART_HEIGHT} testID={`${testID}-svg`}>
            <StandardOverlayLayer
              overlay={overlay}
              domain={geometry.domain}
              plotW={geometry.plotW}
              plotH={geometry.plotH}
            />
            <Path
              d={geometry.pathD}
              stroke={SYSTEM_ACCENT}
              strokeWidth={LINE_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {geometry.coords.map((c) => {
              const selected = c.point.acceptedResultId === activeId;
              return (
                <Circle
                  key={c.point.acceptedResultId}
                  cx={c.x}
                  cy={c.y}
                  r={selected ? SELECTED_R : DOT_R}
                  fill={selected ? SYSTEM_ACCENT : "#0B0B0F"}
                  stroke={SYSTEM_ACCENT}
                  strokeWidth={selected ? 2.5 : 2}
                />
              );
            })}
            {activePoint ? (
              (() => {
                const c = geometry.coords.find(
                  (row) => row.point.acceptedResultId === activePoint.acceptedResultId,
                );
                if (!c) return null;
                return (
                  <Line
                    x1={c.x}
                    x2={c.x}
                    y1={PAD.top}
                    y2={CHART_HEIGHT - PAD.bottom}
                    stroke="#5C5C66"
                    strokeWidth={1}
                    strokeDasharray="3 4"
                  />
                );
              })()
            ) : null}
          </Svg>
        ) : (
          <View style={{ height: CHART_HEIGHT }} />
        )}
      </View>

      {geometry ? (
        <View style={styles.xLabels} testID={`${testID}-x-axis`}>
          <Text style={[styles.xLabel, styles.xLabelStart]}>
            {formatLabTrendAxisLabel(geometry.first.point.collectedDate)}
          </Text>
          {geometry.mid ? (
            <Text style={[styles.xLabel, styles.xLabelMid]}>
              {formatLabTrendAxisLabel(geometry.mid.point.collectedDate)}
            </Text>
          ) : (
            <View />
          )}
          <Text style={[styles.xLabel, styles.xLabelEnd]}>
            {formatLabTrendAxisLabel(geometry.last.point.collectedDate)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    minHeight: 44,
  },
  chartTouch: {
    minHeight: 44,
  },
  selection: {
    gap: 2,
    minHeight: 44,
    justifyContent: "center",
  },
  selectionDate: {
    fontSize: 14,
    color: UI_TEXT_SECONDARY,
  },
  selectionValue: {
    fontSize: 20,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  selectionMeta: {
    fontSize: 12,
    color: UI_TEXT_TERTIARY_LABEL,
  },
  xLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  xLabel: {
    fontSize: 11,
    color: UI_TEXT_TERTIARY_LABEL,
  },
  xLabelStart: { flex: 1, textAlign: "left" },
  xLabelMid: { flex: 1, textAlign: "center" },
  xLabelEnd: { flex: 1, textAlign: "right" },
  singleWrap: {
    gap: 6,
    paddingVertical: 4,
  },
  singleTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  singleDate: {
    fontSize: 14,
    color: UI_TEXT_SECONDARY,
  },
  singleValue: {
    fontSize: 22,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  singleHint: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
    marginTop: 2,
  },
});
