/**
 * Accessible lab trend chart — render + scrub only.
 * Does not fetch, classify, or own latest/prior selection.
 */

import React, { useCallback, useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { buildLabChartDomain } from "@/lib/labs/history/buildLabChartDomain";
import { buildLabTrendAccessibilitySummary } from "@/lib/labs/history/buildLabTrendAccessibilitySummary";
import {
  formatLabTrendAxisLabel,
  formatLabTrendPointDate,
} from "@/lib/labs/history/labTrendCalendar";
import {
  mapChartXToEpochMs,
  selectNearestLabTrendPoint,
} from "@/lib/labs/history/selectNearestLabTrendPoint";
import type { LabTrendPoint, LabTrendSeries } from "@/lib/labs/history/labTrendTypes";
import { evaluateLabSourceReferenceContext } from "@/lib/labs/sourceContext/evaluateLabSourceReferenceContext";
import {
  formatLabSourceFlagCopy,
  formatLabSourceReferenceRawCopy,
  formatLabSourceReferenceStatusCopy,
} from "@/lib/labs/sourceContext/formatLabSourceReferenceCopy";
import { monotonePathD } from "@/lib/ui/body/monotoneLinePath";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
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

export type LabTrendChartProps = {
  series: LabTrendSeries;
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

function sourceContextLines(point: LabTrendPoint): string[] {
  const ctx = evaluateLabSourceReferenceContext({
    result: { kind: "numeric", value: point.value, comparator: "eq" },
    rawReferenceRange: point.rawReferenceRange,
    normalizedFlag: point.reportFlag,
    laboratoryName: point.laboratoryName,
  });
  const lines: string[] = [];
  const status = formatLabSourceReferenceStatusCopy(ctx);
  const flag = formatLabSourceFlagCopy(ctx);
  const raw = formatLabSourceReferenceRawCopy(ctx, { unit: point.unit });
  if (status) lines.push(status);
  if (flag && (!status || !/flagged/i.test(status))) lines.push(flag);
  if (raw) lines.push(raw);
  return lines;
}

export function LabTrendChart({
  series,
  selectedPointId = null,
  onSelectPoint,
  testID = "lab-trend-chart",
}: LabTrendChartProps) {
  const [width, setWidth] = useState(0);
  const [scrubId, setScrubId] = useState<string | null>(null);

  const accessibilityLabel = useMemo(
    () => buildLabTrendAccessibilitySummary(series),
    [series],
  );

  const activeId = scrubId ?? selectedPointId ?? series.latest?.acceptedResultId ?? null;
  const activePoint =
    series.points.find((p) => p.acceptedResultId === activeId) ?? series.latest;

  const geometry = useMemo(() => {
    const domain = buildLabChartDomain(series.points);
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

    // Axis labels: first, optional mid, last — by collection date (not equal spacing).
    const first = coords[0]!;
    const last = coords[coords.length - 1]!;
    const mid =
      coords.length >= 3 ? coords[Math.floor(coords.length / 2)]! : null;

    return { domain, coords, pathD, plotW, first, last, mid };
  }, [series.points, width]);

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
          {sourceContextLines(activePoint).map((line) => (
            <Text key={line} style={styles.selectionMeta} testID={`${testID}-source-context`}>
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
          <Svg width={width} height={CHART_HEIGHT}>
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
