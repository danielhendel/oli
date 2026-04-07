// lib/ui/WeightTrendChart.tsx — Weight trend chart (react-native-svg). Graphite styling; tooltip on press/drag.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import Svg, { Circle, Path, Rect, Text as SvgText } from "react-native-svg";
import type { WeightPoint, WeightRangeKey } from "@/lib/data/useWeightSeries";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

const PADDING = { left: 44, right: 8, top: 8, bottom: 44 };
const Y_LABEL_FONT_SIZE = 11;
const Y_LABEL_COLOR = "#4A4A4F";
/** Minimum vertical gap (px) between High and Low labels to avoid overlap. */
const Y_LABEL_MIN_GAP_PX = 16;
const X_LABEL_FONT_SIZE = 11;
const CHART_HEIGHT = 180;
const DOT_R = 5;
const CROSSHAIR_COLOR = "#8E8E93";

const ACCENT_BLUE = SYSTEM_ACCENT;
const LINE_WIDTH = 2;
const GRID_COLOR = "#E5E5EA";
const AREA_OPACITY = 0.25;
/** Lighter fill below actual low line (same hue as area, lower opacity). */
const BASE_FILL_OPACITY = 0.08;
/** Minimum Y-axis span to reduce visual exaggeration (in user units, converted to kg for domain). */
const MIN_SPAN_LB = 12;
const MIN_SPAN_KG = 5.5;
const MIN_PAD_LB = 2;
const MIN_PAD_KG = 0.9;
const LBS_PER_KG = 2.2046226218;
/** Soft floor: extend baseline down so blue fill reaches ~145 lb (or equivalent kg). */
const DISPLAY_FLOOR_LB = 145;
const DISPLAY_FLOOR_KG = DISPLAY_FLOOR_LB / LBS_PER_KG;
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

/** Monotone cubic interpolation (Fritsch–Carlson / d3 curveMonotoneX). No overshoot between points. */
function monotonePathD(points: { cx: number; cy: number }[]): string {
  if (points.length < 2) return "";
  const m = points.length;
  const x = points.map((p) => p.cx);
  const y = points.map((p) => p.cy);

  const d: number[] = [];
  for (let i = 0; i < m - 1; i++) {
    const dx = x[i + 1]! - x[i]!;
    if (Math.abs(dx) < 1e-10) d.push(0);
    else d.push((y[i + 1]! - y[i]!) / dx);
  }

  const tangents = new Array<number>(m);
  tangents[0] = d[0] ?? 0;
  tangents[m - 1] = d[m - 2] ?? 0;
  for (let i = 1; i < m - 1; i++) {
    const dPrev = d[i - 1] ?? 0;
    const dCur = d[i] ?? 0;
    tangents[i] = dPrev * dCur <= 0 ? 0 : (dPrev + dCur) / 2;
  }

  for (let i = 0; i < m - 1; i++) {
    const di = d[i] ?? 0;
    if (di === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const a = tangents[i]! / di;
      const b = tangents[i + 1]! / di;
      const h = a * a + b * b;
      if (h > 9) {
        const t = 3 / Math.sqrt(h);
        tangents[i] = t * a * di;
        tangents[i + 1] = t * b * di;
      }
    }
  }

  let path = `M ${x[0]} ${y[0]}`;
  for (let i = 0; i < m - 1; i++) {
    const dx = x[i + 1]! - x[i]!;
    const cp1x = x[i]! + dx / 3;
    const cp1y = y[i]! + (tangents[i] ?? 0) * (dx / 3);
    const cp2x = x[i + 1]! - dx / 3;
    const cp2y = y[i + 1]! - (tangents[i + 1] ?? 0) * (dx / 3);
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x[i + 1]} ${y[i + 1]}`;
  }
  return path;
}

/** Safe, display-only source labels. Never show tokens or secrets. */
function sourceLabel(sourceId: string): string {
  if (sourceId === "apple_health") return "Apple Health";
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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type XTick = { tMs: number; label: string; anchor: "start" | "middle" | "end" };

/** X-axis ticks from actual data extents only (trust-first; no labels where there is no data). */
function ticksForRangeUsingData(
  range: WeightRangeKey,
  dataStartMs: number,
  dataEndMs: number,
  processedLength: number,
): XTick[] {
  if (processedLength < 2) return [];
  const ticks: XTick[] = [];

  if (range === "3Y" || range === "5Y" || range === "All") {
    ticks.push(
      {
        tMs: dataStartMs,
        label: new Date(dataStartMs).toLocaleDateString(undefined, { year: "numeric" }),
        anchor: "start",
      },
      {
        tMs: dataEndMs,
        label: new Date(dataEndMs).toLocaleDateString(undefined, { year: "numeric" }),
        anchor: "end",
      },
    );
    return ticks;
  }

  if (range === "1Y" || range === "YTD") {
    const midT = dataStartMs + (dataEndMs - dataStartMs) / 2;
    const triple = [dataStartMs, midT, dataEndMs] as const;
    triple.forEach((tMs, i) => {
      ticks.push({
        tMs,
        label: new Date(tMs).toLocaleDateString(undefined, { month: "short" }),
        anchor: i === 0 ? "start" : i === 2 ? "end" : "middle",
      });
    });
    return ticks;
  }

  if (range === "6M") {
    const start = new Date(dataStartMs);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    let t = start.getTime();
    if (t < dataStartMs) {
      start.setMonth(start.getMonth() + 1);
      t = start.getTime();
    }
    const monthTicks: { tMs: number; label: string }[] = [];
    while (t <= dataEndMs) {
      monthTicks.push({
        tMs: t,
        label: new Date(t).toLocaleDateString(undefined, { month: "short" }),
      });
      start.setMonth(start.getMonth() + 1);
      t = start.getTime();
    }
    if (monthTicks.length === 0) return [];
    let toShow = monthTicks;
    if (monthTicks.length > 6) {
      const step = Math.max(1, Math.floor((monthTicks.length - 1) / 4));
      toShow = [monthTicks[0]!];
      for (let i = step; i < monthTicks.length - 1; i += step) toShow.push(monthTicks[i]!);
      toShow.push(monthTicks[monthTicks.length - 1]!);
    }
    toShow.forEach(({ tMs, label }, i) => {
      ticks.push({
        tMs,
        label,
        anchor: i === 0 ? "start" : i === toShow.length - 1 ? "end" : "middle",
      });
    });
    return ticks;
  }

  if (range === "30D" || range === "90D") {
    const midT = dataStartMs + (dataEndMs - dataStartMs) / 2;
    const triple = [dataStartMs, midT, dataEndMs] as const;
    triple.forEach((tMs, i) => {
      ticks.push({
        tMs,
        label: new Date(tMs).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        anchor: i === 0 ? "start" : i === 2 ? "end" : "middle",
      });
    });
    return ticks;
  }

  if (range === "7D") {
    const spanDays = (dataEndMs - dataStartMs) / MS_PER_DAY;
    if (spanDays > 8) return [];
    const dStart = new Date(dataStartMs);
    dStart.setHours(0, 0, 0, 0);
    const startDayMs = dStart.getTime();
    const dEnd = new Date(dataEndMs);
    dEnd.setHours(0, 0, 0, 0);
    const endDayMs = dEnd.getTime();
    const dayTicks: XTick[] = [];
    let t = startDayMs;
    while (t <= endDayMs) {
      dayTicks.push({
        tMs: t,
        label: new Date(t).toLocaleDateString(undefined, { weekday: "short" }),
        anchor: dayTicks.length === 0 ? "start" : "middle",
      });
      t += MS_PER_DAY;
    }
    if (dayTicks.length > 0) dayTicks[dayTicks.length - 1]!.anchor = "end";
    if (dayTicks.length < 4) return [];
    return dayTicks;
  }

  return ticks;
}

export type WeightTrendChartProps = {
  points: WeightPoint[];
  unitLabel: string;
  formatValue: (weightKg: number) => string;
  range: WeightRangeKey;
  valueKind?: "mass" | "generic";
  accentColor?: string;
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
  range,
  valueKind = "mass",
  accentColor = ACCENT_BLUE,
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

  /** Robust Y-domain: p05–p95 with 2% padding; then enforce minimum span/padding to reduce visual exaggeration. */
  const { displayMin, displayMax, outlierCount } = (() => {
    const n = processed.length;
    let dMin: number;
    let dMax: number;
    if (n < 3) {
      dMin = Math.max(0, minW);
      dMax = maxW;
    } else {
      const sorted = [...processed.map((p) => p.weightKg)].sort((a, b) => a - b);
      const p05 = sorted[Math.floor((n - 1) * 0.05)] ?? minW;
      const p95 = sorted[Math.floor((n - 1) * 0.95)] ?? maxW;
      const range = p95 - p05 || 0.1;
      const padding = 0.02 * range;
      dMin = p05 - padding;
      dMax = p95 + padding;

      const spanMinKg = valueKind === "mass" && unitLabel === "lb" ? MIN_SPAN_LB / LBS_PER_KG : MIN_SPAN_KG;
      const padMinKg = valueKind === "mass" && unitLabel === "lb" ? MIN_PAD_LB / LBS_PER_KG : MIN_PAD_KG;
      const currentSpanKg = dMax - dMin;
      const midKg = (dMin + dMax) / 2;
      if (currentSpanKg < spanMinKg) {
        dMin = midKg - spanMinKg / 2;
        dMax = midKg + spanMinKg / 2;
      } else {
        const padBottom = midKg - dMin;
        const padTop = dMax - midKg;
        if (padBottom < padMinKg) dMin = midKg - padMinKg;
        if (padTop < padMinKg) dMax = midKg + padMinKg;
      }
      dMin = Math.max(0, dMin);
    }
    if (valueKind === "mass" && unitLabel === "lb" && dMin * LBS_PER_KG > DISPLAY_FLOOR_LB) dMin = DISPLAY_FLOOR_LB / LBS_PER_KG;
    if (valueKind === "mass" && unitLabel === "kg" && dMin > DISPLAY_FLOOR_KG) dMin = DISPLAY_FLOOR_KG;
    dMin = Math.max(0, dMin);
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

  const n = processed.length;
  const isSparse = n < 3;

  /** Line path: sparse (1–2 points) uses straight segment or none; else monotone cubic (no overshoot). */
  const pathD = (() => {
    if (isSparse) {
      if (n === 1) return "";
      if (n === 2 && renderPoints.length >= 2) {
        const p0 = renderPoints[0]!;
        const p1 = renderPoints[1]!;
        return `M ${p0.cx} ${p0.cy} L ${p1.cx} ${p1.cy}`;
      }
      return "";
    }
    return monotonePathD(renderPoints);
  })();

  const baselineY = PADDING.top + chartHeight;

  /** Actual data min/max (kg) from current points; used for Y labels and dashed guide lines. */
  const actualMinW =
    processed.length > 0 ? Math.min(...processed.map((p) => p.weightKg)) : displayMin;
  const actualMaxW =
    processed.length > 0 ? Math.max(...processed.map((p) => p.weightKg)) : displayMax;
  const clampedHigh = Math.max(displayMin, Math.min(displayMax, actualMaxW));
  const clampedLow = Math.max(displayMin, Math.min(displayMax, actualMinW));
  const yHigh = toChartY(clampedHigh);
  const yLow = toChartY(clampedLow);
  /** Exact values, one decimal; no unit suffix. */
  const highLabel =
    valueKind === "mass" && unitLabel === "lb"
      ? (actualMaxW * LBS_PER_KG).toFixed(1)
      : actualMaxW.toFixed(1);
  const lowLabel =
    valueKind === "mass" && unitLabel === "lb"
      ? (actualMinW * LBS_PER_KG).toFixed(1)
      : actualMinW.toFixed(1);
  const isSparseLabels = processed.length < 2;
  const singleValueLabel = isSparseLabels ? highLabel : null;
  const labelsTooClose = Math.abs(yHigh - yLow) < Y_LABEL_MIN_GAP_PX;

  /** X-axis: data extents only (trust-first). */
  const dataStartMs = minT;
  const dataEndMs = maxT;

  /** X-axis ticks from actual data extents; no labels if insufficient data. */
  const xAxisTicks = useMemo(
    () => ticksForRangeUsingData(range, dataStartMs, dataEndMs, processed.length),
    [range, dataStartMs, dataEndMs, processed.length],
  );
  const xAxisY = PADDING.top + chartHeight + 18;

  /** Area fill only when >= 3 points; sparse windows must not show filled triangle. */
  const areaD =
    !isSparse && renderPoints.length >= 2
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
          {/* Dashed horizontal guide lines at actual data High/Low (behind area/line) */}
          {!isSparseLabels && (
            <>
              <Path
                d={`M ${PADDING.left} ${yHigh} L ${layout.width - PADDING.right} ${yHigh}`}
                stroke="#C7C7CC"
                strokeWidth={1}
                strokeDasharray="4 4"
                fill="none"
              />
              <Path
                d={`M ${PADDING.left} ${yLow} L ${layout.width - PADDING.right} ${yLow}`}
                stroke="#C7C7CC"
                strokeWidth={1}
                strokeDasharray="4 4"
                fill="none"
              />
            </>
          )}
          {isSparseLabels && (
            <Path
              d={`M ${PADDING.left} ${yHigh} L ${layout.width - PADDING.right} ${yHigh}`}
              stroke="#C7C7CC"
              strokeWidth={1}
              strokeDasharray="4 4"
              fill="none"
            />
          )}
          {/* Y-axis labels: exact actual values (one decimal); hide Low if too close to High */}
          {!isSparseLabels && (
            <>
              <SvgText
                x={4}
                y={yHigh}
                fontSize={Y_LABEL_FONT_SIZE}
                fill={Y_LABEL_COLOR}
                textAnchor="start"
                alignmentBaseline="middle"
              >
                {highLabel}
              </SvgText>
              {!labelsTooClose && (
                <SvgText
                  x={4}
                  y={yLow}
                  fontSize={Y_LABEL_FONT_SIZE}
                  fill={Y_LABEL_COLOR}
                  textAnchor="start"
                  alignmentBaseline="middle"
                >
                  {lowLabel}
                </SvgText>
              )}
            </>
          )}
          {isSparseLabels && singleValueLabel != null && (
            <SvgText
              x={4}
              y={yHigh}
              fontSize={Y_LABEL_FONT_SIZE}
              fill={Y_LABEL_COLOR}
              textAnchor="start"
              alignmentBaseline="middle"
            >
              {singleValueLabel}
            </SvgText>
          )}
          {/* Base tint below low dashed line (lighter blue) */}
          {processed.length > 0 && (
            <Rect
              x={PADDING.left}
              y={yLow}
              width={layout.width - PADDING.left - PADDING.right}
              height={Math.max(0, baselineY - yLow)}
              fill={accentColor}
              fillOpacity={BASE_FILL_OPACITY}
            />
          )}
          {/* Area fill under line — render before line so line stays on top */}
          {areaD ? (
            <Path
              d={areaD}
              fill={accentColor}
              fillOpacity={AREA_OPACITY}
              stroke="none"
            />
          ) : null}
          {/* Line */}
          {pathD ? (
            <Path
              d={pathD}
              stroke={accentColor}
              strokeWidth={LINE_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {/* Dot marker: only while touching (selection active); no persistent dots */}
          {touchX != null && selected != null &&
            (selected.isClipped ? (
              <Circle
                cx={selected.cx}
                cy={selected.cy}
                r={DOT_R}
                fill="none"
                stroke={accentColor}
                strokeWidth={2}
                opacity={1}
              />
            ) : (
              <Circle cx={selected.cx} cy={selected.cy} r={DOT_R} fill={accentColor} opacity={1} />
            ))}
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
          {/* X-axis time labels (data-extent only; first/last at plot edges so no clipping) */}
          {layout &&
            xAxisTicks.map((tick, i) => {
              const isFirst = i === 0;
              const isLast = i === xAxisTicks.length - 1;
              const x =
                isFirst
                  ? PADDING.left
                  : isLast
                    ? layout.width - PADDING.right
                    : toChartX(tick.tMs);
              return (
                <SvgText
                  key={`${tick.tMs}-${i}`}
                  x={x}
                  y={xAxisY}
                  fontSize={X_LABEL_FONT_SIZE}
                  fill={Y_LABEL_COLOR}
                  textAnchor={tick.anchor}
                >
                  {tick.label}
                </SvgText>
              );
            })}
        </Svg>
      )}
      {outlierCount > 0 && (
        <Text style={styles.outlierNote} accessibilityLabel={`${outlierCount} outlier(s) clipped for readability`}>
          {outlierCount} outlier(s) clipped for readability
        </Text>
      )}
      {isSparse && (
        <Text style={styles.sparseNote} accessibilityLabel="Not enough weigh-ins in this range">
          Not enough weigh-ins in this range
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
          accessibilityLabel={`${new Date(selPoint.observedAt).toLocaleString()}, ${formatValue(selPoint.weightKg)}${unitLabel ? ` ${unitLabel}` : ""}${selPoint.sourceId ? `, ${sourceLabel(selPoint.sourceId)}` : ""}`}
        >
          <Text style={styles.tooltipDate}>
            {new Date(selPoint.observedAt).toLocaleString()}
          </Text>
          <Text style={styles.tooltipValue}>
            {formatValue(selPoint.weightKg)}{unitLabel ? ` ${unitLabel}` : ""}
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
  sparseNote: {
    fontSize: 11,
    color: "#6E6E73",
    marginTop: 6,
  },
});
