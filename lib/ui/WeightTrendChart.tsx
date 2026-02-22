// lib/ui/WeightTrendChart.tsx — Weight trend chart (react-native-svg). Graphite styling; tooltip on press/drag.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { WeightPoint } from "@/lib/data/useWeightSeries";

const PADDING = { left: 8, right: 8, top: 8, bottom: 24 };
const CHART_HEIGHT = 180;
const DOT_R = 5;
const CROSSHAIR_COLOR = "#8E8E93";
const LINE_COLOR = "#3C3C43";
const LINE_WIDTH = 2;
const DOT_FILL = "#3C3C43";
const GRID_COLOR = "#E5E5EA";
const AREA_FILL = "#3C3C43";
const AREA_OPACITY = 0.1;
/** Max points used to draw path/area/dots; touch and tooltip still use full data. */
const MAX_RENDER_POINTS = 80;

/** Largest-Triangle-Three-Buckets downsampling for time-series; keeps first/last and picks middle points for best visual fidelity. */
function downsampleLTTB<T extends { x: number; cy: number }>(
  points: T[],
  maxPoints: number,
): T[] {
  const n = points.length;
  if (n <= maxPoints) return points;
  if (maxPoints <= 2) return points.slice(0, maxPoints);
  const result: T[] = [points[0]!];
  const numBuckets = maxPoints - 2;
  const bucketSize = (n - 2) / numBuckets;
  for (let a = 0; a < numBuckets; a++) {
    const bucketStart = Math.floor(a * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor((a + 1) * bucketSize) + 1, n - 1);
    const nextBucketStart = Math.floor((a + 1) * bucketSize) + 1;
    const nextBucketEnd = Math.min(Math.floor((a + 2) * bucketSize) + 1, n - 1);
    let avgNextX = 0;
    let avgNextY = 0;
    let nextCount = 0;
    for (let i = nextBucketStart; i < nextBucketEnd && i < n; i++) {
      avgNextX += points[i]!.x;
      avgNextY += points[i]!.cy;
      nextCount++;
    }
    if (nextCount > 0) {
      avgNextX /= nextCount;
      avgNextY /= nextCount;
    } else {
      avgNextX = points[n - 1]!.x;
      avgNextY = points[n - 1]!.cy;
    }
    const prev = result[result.length - 1]!;
    let bestIdx = bucketStart;
    let bestArea = 0;
    for (let i = bucketStart; i < bucketEnd; i++) {
      const p = points[i]!;
      const area = Math.abs(
        (prev.x - avgNextX) * (p.cy - prev.cy) - (prev.x - p.x) * (avgNextY - prev.cy),
      );
      if (area > bestArea) {
        bestArea = area;
        bestIdx = i;
      }
    }
    result.push(points[bestIdx]!);
  }
  result.push(points[n - 1]!);
  return result;
}

/** Build smooth SVG path through points using cubic Bezier (Catmull-Rom style). */
function smoothPathD(points: { cx: number; cy: number }[]): string {
  if (points.length < 2) return "";
  const p = (i: number) => points[Math.max(0, Math.min(i, points.length - 1))]!;
  let d = `M ${p(0).cx} ${p(0).cy}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = p(i - 1);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = p(i + 2);
    const cp1x = p1.cx + (p2.cx - p0.cx) / 6;
    const cp1y = p1.cy + (p2.cy - p0.cy) / 6;
    const cp2x = p2.cx - (p3.cx - p1.cx) / 6;
    const cp2y = p2.cy - (p3.cy - p1.cy) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.cx} ${p2.cy}`;
  }
  return d;
}

/** Safe, display-only source labels. Never show tokens or secrets. */
function sourceLabel(sourceId: string): string {
  if (sourceId === "withings") return "Withings";
  if (sourceId === "manual") return "Manual";
  if (typeof sourceId === "string" && sourceId.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(sourceId))
    return sourceId;
  return "—";
}

/** Parse ISO timestamp to ms; null if invalid. Used for X-axis so each entry has a unique position (no same-day stacking). */
function parseTimestampMs(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export type WeightTrendChartProps = {
  points: WeightPoint[];
  unitLabel: "kg" | "lb";
  formatValue: (weightKg: number) => string;
  onChartError?: (message: string) => void;
};

type ProcessedPoint = {
  x: number;
  y: number;
  weightKg: number;
  observedAt: string;
  sourceId: string;
};

export function WeightTrendChart({
  points,
  unitLabel,
  formatValue,
  onChartError,
}: WeightTrendChartProps) {
  const [layout, setLayout] = useState<{ width: number; height: number } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [touchX, setTouchX] = useState<number | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
  }, []);

  const { processed, error } = useMemo(() => {
    const valid: ProcessedPoint[] = [];
    for (const p of points) {
      const tMs = parseTimestampMs(p.observedAt);
      if (tMs == null) continue;
      valid.push({
        x: tMs,
        y: 0,
        weightKg: p.weightKg,
        observedAt: p.observedAt,
        sourceId: p.sourceId,
      });
    }
    if (points.length > 0 && valid.length === 0) {
      return { processed: [], error: "Unable to display chart: invalid date in data." };
    }
    const sorted = [...valid].sort((a, b) => a.x - b.x);
    return { processed: sorted, error: null };
  }, [points]);

  useEffect(() => {
    if (error && onChartError) onChartError(error);
  }, [error, onChartError]);

  if (points.length === 0) {
    return null;
  }

  if (processed.length === 0) {
    return null;
  }

  const chartWidth = layout ? layout.width - PADDING.left - PADDING.right : 0;
  const chartHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const minT = Math.min(...processed.map((p) => p.x));
  const maxT = Math.max(...processed.map((p) => p.x));
  const rangeT = maxT - minT || 1;
  const minW = Math.min(...processed.map((p) => p.weightKg));
  const maxW = Math.max(...processed.map((p) => p.weightKg));

  /** Robust Y-domain: p05–p95 with 2% padding to avoid edge clipping; fall back to min/max if <3 points. */
  const { displayMin, displayMax, outlierCount } = (() => {
    const n = processed.length;
    if (n < 3) {
      return {
        displayMin: minW,
        displayMax: maxW,
        outlierCount: 0,
      };
    }
    const sorted = [...processed.map((p) => p.weightKg)].sort((a, b) => a - b);
    const p05 = sorted[Math.floor((n - 1) * 0.05)] ?? minW;
    const p95 = sorted[Math.floor((n - 1) * 0.95)] ?? maxW;
    const range = p95 - p05 || 0.1;
    const padding = 0.02 * range;
    const dMin = p05 - padding;
    const dMax = p95 + padding;
    const count = processed.filter((p) => p.weightKg < dMin || p.weightKg > dMax).length;
    return { displayMin: dMin, displayMax: dMax, outlierCount: count };
  })();

  const rangeDisplay = displayMax - displayMin || 0.1;

  /** X-axis: linear scale from tMs (Date.parse(observedAt)) domain to screen; eliminates same-day vertical stacking. */
  const toChartX = (tMs: number) =>
    PADDING.left + ((tMs - minT) / rangeT) * chartWidth;
  /** Y-axis: maps [displayMin, displayMax] to chart bottom–top; outliers are clamped to edges. */
  const toChartY = (w: number) =>
    PADDING.top + chartHeight - ((w - displayMin) / rangeDisplay) * chartHeight;

  const pointsWithCoords = processed.map((p) => {
    const clampedW = Math.max(displayMin, Math.min(displayMax, p.weightKg));
    const cy = toChartY(clampedW);
    const isClipped = p.weightKg < displayMin || p.weightKg > displayMax;
    return {
      ...p,
      cx: toChartX(p.x),
      cy,
      isClipped,
    };
  });

  /** Downsample for rendering only; touch/tooltip still use full pointsWithCoords. */
  const renderPoints = downsampleLTTB(pointsWithCoords, MAX_RENDER_POINTS);

  /** Smooth cubic Bezier path through (possibly downsampled) render points. */
  const pathD = smoothPathD(renderPoints);

  const baselineY = PADDING.top + chartHeight;
  /** Adaptive fill: area under the same smooth path, closed to baseline. */
  const areaD =
    renderPoints.length >= 2
      ? `${pathD} L ${renderPoints[renderPoints.length - 1]!.cx} ${baselineY} L ${renderPoints[0]!.cx} ${baselineY} Z`
      : "";

  /** Nearest-point selection by tMs (timestamp); touch X is mapped to data time then compared to each point's x (observedAt ms). */
  const handleTouch = useCallback(
    (ev: { locationX: number }) => {
      if (chartWidth <= 0 || pointsWithCoords.length === 0) return;
      const x = ev.locationX;
      setTouchX(x);
      const tMsAtTouch = minT + ((x - PADDING.left) / chartWidth) * rangeT;
      let best = 0;
      let bestDist = Math.abs(pointsWithCoords[0]!.x - tMsAtTouch);
      for (let i = 1; i < pointsWithCoords.length; i++) {
        const d = Math.abs(pointsWithCoords[i]!.x - tMsAtTouch);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      setSelectedIndex(best);
    },
    [chartWidth, rangeT, minT, pointsWithCoords],
  );

  const selected = selectedIndex != null ? pointsWithCoords[selectedIndex] ?? null : null;
  const selPoint = selectedIndex != null ? processed[selectedIndex] ?? null : null;

  return (
    <View
      style={styles.container}
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => handleTouch(e.nativeEvent)}
      onResponderMove={(e) => handleTouch(e.nativeEvent)}
      onResponderRelease={() => {
        setTouchX(null);
        setSelectedIndex(null);
      }}
      accessibilityRole="none"
      accessibilityLabel="Weight trend chart"
    >
      {layout && layout.width > 0 && (
        <Svg width={layout.width} height={CHART_HEIGHT} style={styles.svg}>
          {/* Minimal grid: horizontal lines only */}
          {[0.25, 0.5, 0.75].map((frac) => {
            const y = PADDING.top + chartHeight * (1 - frac);
            return (
              <Path
                key={frac}
                d={`M ${PADDING.left} ${y} L ${layout.width - PADDING.right} ${y}`}
                stroke={GRID_COLOR}
                strokeWidth={1}
                fill="none"
              />
            );
          })}
          {/* Area fill under line (graphite, subtle) — render before line so line stays on top */}
          {areaD ? (
            <Path
              d={areaD}
              fill={AREA_FILL}
              fillOpacity={AREA_OPACITY}
              stroke="none"
            />
          ) : null}
          {/* Line */}
          {pathD ? (
            <Path
              d={pathD}
              stroke={LINE_COLOR}
              strokeWidth={LINE_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {/* Dots: from render points (downsampled); selected point drawn again if not in set so crosshair has a dot */}
          {renderPoints.map((p, i) => {
            const isSelected = selected != null && p.cx === selected.cx && p.cy === selected.cy;
            return p.isClipped ? (
              <Circle
                key={`r-${i}`}
                cx={p.cx}
                cy={p.cy}
                r={DOT_R}
                fill="none"
                stroke={DOT_FILL}
                strokeWidth={2}
                opacity={isSelected ? 1 : 0.8}
              />
            ) : (
              <Circle
                key={`r-${i}`}
                cx={p.cx}
                cy={p.cy}
                r={DOT_R}
                fill={DOT_FILL}
                opacity={isSelected ? 1 : renderPoints.length === 1 ? 1 : 0.8}
              />
            );
          })}
          {selected != null && !renderPoints.some((p) => p.cx === selected.cx && p.cy === selected.cy) ? (
            selected.isClipped ? (
              <Circle
                key="selected"
                cx={selected.cx}
                cy={selected.cy}
                r={DOT_R}
                fill="none"
                stroke={DOT_FILL}
                strokeWidth={2}
                opacity={1}
              />
            ) : (
              <Circle key="selected" cx={selected.cx} cy={selected.cy} r={DOT_R} fill={DOT_FILL} opacity={1} />
            )
          ) : null}
          {/* Crosshair at selected x */}
          {touchX != null && selected != null && (
            <Path
              d={`M ${selected.cx} ${PADDING.top} L ${selected.cx} ${PADDING.top + chartHeight}`}
              stroke={CROSSHAIR_COLOR}
              strokeWidth={1}
              strokeDasharray="4 2"
              fill="none"
            />
          )}
        </Svg>
      )}
      {outlierCount > 0 && (
        <Text style={styles.outlierNote} accessibilityLabel={`${outlierCount} outlier(s) clipped for readability`}>
          {outlierCount} outlier(s) clipped for readability
        </Text>
      )}
      {/* Tooltip card (View over SVG) — never block the selected point; position above or below */}
      {selPoint && selected && (
        <View
          style={[
            styles.tooltip,
            selected.cy <= CHART_HEIGHT / 2 ? styles.tooltipBelow : styles.tooltipAbove,
          ]}
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${new Date(selPoint.observedAt).toLocaleString()}, ${formatValue(selPoint.weightKg)} ${unitLabel}${selPoint.sourceId ? `, ${sourceLabel(selPoint.sourceId)}` : ""}`}
        >
          <Text style={styles.tooltipDate}>
            {new Date(selPoint.observedAt).toLocaleString()}
          </Text>
          <Text style={styles.tooltipValue}>
            {formatValue(selPoint.weightKg)} {unitLabel}
          </Text>
          {selPoint.sourceId ? (
            <Text style={styles.tooltipSource}>{sourceLabel(selPoint.sourceId)}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: CHART_HEIGHT,
  },
  svg: {
    backgroundColor: "transparent",
  },
  tooltip: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  tooltipAbove: {
    bottom: CHART_HEIGHT + 8,
  },
  tooltipBelow: {
    top: CHART_HEIGHT + 8,
  },
  tooltipDate: {
    fontSize: 12,
    color: "#6E6E73",
    marginBottom: 2,
  },
  tooltipValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  tooltipSource: {
    fontSize: 12,
    color: "#6E6E73",
    marginTop: 4,
  },
  outlierNote: {
    fontSize: 11,
    color: "#6E6E73",
    marginTop: 6,
    fontStyle: "italic",
  },
});
