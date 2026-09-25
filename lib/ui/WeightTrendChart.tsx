import {
  UI_TEXT_MUTED,
} from "@/lib/ui/theme/uiTokens";

// lib/ui/WeightTrendChart.tsx — Weight trend chart (react-native-svg). Dark Oli hero styling.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { buildWeightAxisTicks } from "@/lib/body/presentation/buildWeightAxisTicks";
import {
  clipWeightTrendBandToDomain,
  type WeightTrendClassificationBandsModel,
} from "@/lib/body/presentation/buildWeightTrendClassificationBands";
import {
  resolveWeightTrendMonthMarkersForRange,
  WEIGHT_TREND_MONTH_LABEL_RANGES,
} from "@/lib/body/presentation/buildWeightTrendMonthMarkers";
import { resolveWeightTrendYDomain } from "@/lib/body/presentation/resolveWeightTrendYDomain";
import type { WeightPoint, WeightRangeKey } from "@/lib/data/useWeightSeries";
import {
  SYSTEM_ACCENT_LUMINOUS,
  SYSTEM_ACCENT_LUMINOUS_GLOW,
  SYSTEM_ACCENT_NAVY_DEPTH,
} from "@/lib/ui/theme/systemAccent";
import {
  resolveWeightClassificationColor,
} from "@/lib/ui/theme/bodyMetricClassificationChrome";

/** Plot inset — bottom reserves room for month-letter markers. */
const PADDING = { left: 40, right: 12, top: 14, bottom: 30 };
const Y_LABEL_FONT_SIZE = 11;
const Y_LABEL_COLOR = UI_TEXT_MUTED;
/** Hero chart height — visually dominant on Weight detail. */
const DEFAULT_CHART_HEIGHT = 320;
const DOT_R = 5;
const DOT_GLOW_R = 10;
/** Active inspection guide — always visible on active/latest point; high contrast on bands. */
const CROSSHAIR_COLOR = "rgba(255,255,255,0.78)";
const CROSSHAIR_GLOW = "rgba(255,255,255,0.28)";
const CROSSHAIR_CORE_WIDTH = 2;
const CROSSHAIR_GLOW_WIDTH = 5;
const PLOT_EDGE_STROKE = "rgba(255,255,255,0.14)";
const BAND_DIVIDER = "rgba(11,13,16,0.38)";
const MONTH_LETTER_COLOR = "rgba(180, 196, 220, 0.72)";
const MONTH_LETTER_SIZE = 10;

const ACCENT_BLUE = SYSTEM_ACCENT_LUMINOUS;
/** High-contrast Weight trend core — thin, elevated over classification bands. */
const LINE_CORE_WHITE = "#FFFFFF";
const LINE_GLOW_BLUE = "rgba(91, 140, 255, 0.30)";
const LINE_GLOW_SOFT = "rgba(255,255,255,0.14)";
const LINE_WIDTH = 2.05;
const LINE_GLOW_WIDTH = 5.5;
const LINE_SOFT_WIDTH = 9;
/** Neutral grid — calm under bright band fills. */
const GRID_COLOR = "rgba(160, 176, 200, 0.09)";
/** Max points used to draw path/area/dots; touch/inspection still use full data. */
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

/** Parse ISO timestamp to ms; null if invalid. Used for X-axis so each entry has a unique position (no same-day stacking). */
function parseTimestampMs(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export type WeightTrendChartInspectPoint = {
  readonly observedAt: string;
  readonly dayKey: string;
  readonly weightKg: number;
  readonly sourceId: string;
};

export type WeightTrendChartProps = {
  points: readonly WeightPoint[];
  unitLabel: string;
  formatValue: (weightKg: number) => string;
  range: WeightRangeKey;
  valueKind?: "mass" | "generic";
  accentColor?: string;
  onChartError?: (message: string) => void;
  /** Always mark the chronologically latest observation (not a classification). */
  emphasizeLatestPoint?: boolean;
  accessibilityLabel?: string;
  /** Hero plot height in points. */
  chartHeight?: number;
  /**
   * Fixed-hero inspection callback. Fired with the nearest point while scrubbing,
   * and `null` on release. Floating tooltips are intentionally not rendered.
   */
  onInspectChange?: (point: WeightTrendChartInspectPoint | null) => void;
  /**
   * Optional CDC/WHO Weight classification bands for chart background.
   * When unavailable, chart renders without classification zones.
   */
  classificationBands?: WeightTrendClassificationBandsModel | null;
  /**
   * High-contrast white core + blue glow — preferred for Weight detail with
   * classification background bands.
   */
  highContrastLine?: boolean;
};

type ProcessedPoint = {
  x: number;
  y: number;
  weightKg: number;
  observedAt: string;
  dayKey: string;
  sourceId: string;
};

export function WeightTrendChart({
  points,
  unitLabel,
  formatValue: _formatValue,
  range,
  valueKind = "mass",
  accentColor = ACCENT_BLUE,
  onChartError,
  emphasizeLatestPoint = false,
  accessibilityLabel = "Weight trend chart",
  chartHeight: chartHeightProp = DEFAULT_CHART_HEIGHT,
  onInspectChange,
  classificationBands = null,
  highContrastLine = false,
}: WeightTrendChartProps) {
  void _formatValue;
  const CHART_HEIGHT = chartHeightProp;
  const useHighContrastLine = highContrastLine || classificationBands?.status === "ready";
  const lineStroke = useHighContrastLine ? LINE_CORE_WHITE : accentColor;
  const lineGlow = useHighContrastLine ? LINE_GLOW_BLUE : SYSTEM_ACCENT_LUMINOUS_GLOW;
  const pointFill = useHighContrastLine ? LINE_CORE_WHITE : accentColor;
  const pointRing = useHighContrastLine ? ACCENT_BLUE : "#FFFFFF";
  const [layout, setLayout] = useState<{ width: number; height: number } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const onInspectRef = useRef(onInspectChange);
  onInspectRef.current = onInspectChange;
  const lastInspectedAtRef = useRef<string | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
  }, []);

  /**
   * Content identity for reset — NOT array reference.
   * Parent re-renders (e.g. hero inspection state) must not clear scrub state
   * when the underlying observations are unchanged.
   */
  const pointsContentKey = useMemo(
    () =>
      points
        .map((p) => `${p.observedAt}\0${p.weightKg}\0${p.dayKey}\0${p.sourceId}`)
        .join("|"),
    [points],
  );

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
        dayKey: p.dayKey,
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

  useEffect(() => {
    setSelectedIndex(null);
    lastInspectedAtRef.current = null;
    onInspectRef.current?.(null);
  }, [range, pointsContentKey]);

  if (points.length === 0) {
    return null;
  }

  if (processed.length === 0) {
    return null;
  }

  const chartWidth = layout ? layout.width - PADDING.left - PADDING.right : 0;
  const showMonthLabels = WEIGHT_TREND_MONTH_LABEL_RANGES.has(range);
  const padBottom = showMonthLabels ? 30 : 16;
  const chartHeight = CHART_HEIGHT - PADDING.top - padBottom;

  const minT = Math.min(...processed.map((p) => p.x));
  const maxT = Math.max(...processed.map((p) => p.x));
  const rangeT = maxT - minT || 1;

  const { displayMin, displayMax, outlierCount } = resolveWeightTrendYDomain({
    valuesKg: processed.map((p) => p.weightKg),
    valueKind,
    unitLabel,
  });

  const massAxis =
    valueKind === "mass" && (unitLabel === "lb" || unitLabel === "kg")
      ? buildWeightAxisTicks({
          minKg: Math.min(...processed.map((p) => p.weightKg)),
          maxKg: Math.max(...processed.map((p) => p.weightKg)),
          unit: unitLabel,
        })
      : null;

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

  /** Downsample for rendering only; touch/inspection still use full pointsWithCoords. */
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

  /** Generic (non-mass) fallback labels at observed high/low. */
  const actualMinW =
    processed.length > 0 ? Math.min(...processed.map((p) => p.weightKg)) : displayMin;
  const actualMaxW =
    processed.length > 0 ? Math.max(...processed.map((p) => p.weightKg)) : displayMax;
  const genericHighLabel = actualMaxW.toFixed(1);
  const genericLowLabel = actualMinW.toFixed(1);

  // Keep selected range available for callers; observed coverage lives under the chart.
  void range;

  /** Area fill only when >= 3 points; sparse windows must not show filled triangle. */
  const areaD =
    !isSparse && renderPoints.length >= 2
      ? `${pathD} L ${renderPoints[renderPoints.length - 1]!.cx} ${baselineY} L ${renderPoints[0]!.cx} ${baselineY} Z`
      : "";

  const yAxisTicks =
    massAxis?.status === "ready"
      ? massAxis.ticks
      : [
          { valueKg: actualMaxW, label: genericHighLabel },
          { valueKg: actualMinW, label: genericLowLabel },
        ].filter((t, i, arr) => i === 0 || t.label !== arr[0]!.label);

  /** Nearest-point selection by tMs (timestamp); touch X is mapped to data time then compared to each point's x (observedAt ms). */
  const handleTouch = useCallback(
    (ev: { locationX: number }) => {
      if (chartWidth <= 0 || pointsWithCoords.length === 0) return;
      const x = ev.locationX;
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
      const pt = pointsWithCoords[best]!;
      if (lastInspectedAtRef.current !== pt.observedAt) {
        lastInspectedAtRef.current = pt.observedAt;
        onInspectRef.current?.({
          observedAt: pt.observedAt,
          dayKey: pt.dayKey,
          weightKg: pt.weightKg,
          sourceId: pt.sourceId,
        });
      }
    },
    [chartWidth, rangeT, minT, pointsWithCoords],
  );

  const clearInspection = useCallback(() => {
    setSelectedIndex(null);
    lastInspectedAtRef.current = null;
    onInspectRef.current?.(null);
  }, []);

  const selected = selectedIndex != null ? pointsWithCoords[selectedIndex] ?? null : null;

  const latestPt =
    emphasizeLatestPoint && pointsWithCoords.length > 0
      ? pointsWithCoords[pointsWithCoords.length - 1]!
      : null;

  /** Active guide always follows scrub selection, else latest (at rest). */
  const guidePt = selected ?? (emphasizeLatestPoint ? latestPt : null);

  const plotLeft = PADDING.left;
  const plotWidth = Math.max(0, (layout?.width ?? 0) - PADDING.left - PADDING.right);
  const plotTop = PADDING.top;
  const plotBottom = PADDING.top + chartHeight;

  const visibleBands =
    classificationBands?.status === "ready" && layout && layout.width > 0
      ? classificationBands.bands
          .map((band) => {
            const clipped = clipWeightTrendBandToDomain({
              band,
              displayMinKg: displayMin,
              displayMaxKg: displayMax,
              softMinKg: classificationBands.softExtentKg[0],
              softMaxKg: classificationBands.softExtentKg[1],
            });
            if (clipped == null) return null;
            const yTop = toChartY(clipped.upperKg);
            const yBottom = toChartY(clipped.lowerKg);
            return {
              id: band.id,
              label: band.label,
              tone: band.tone,
              y: yTop,
              height: Math.max(0, yBottom - yTop),
            };
          })
          .filter((b): b is NonNullable<typeof b> => b != null && b.height > 0)
      : [];

  const monthMarkers =
    layout && layout.width > 0 && chartWidth > 0
      ? resolveWeightTrendMonthMarkersForRange({
          range,
          minTimeMs: minT,
          maxTimeMs: maxT,
          toChartX,
        })
      : [];

  const monthLabelY = plotBottom + 14;

  return (
    <View
      style={[styles.container, { minHeight: CHART_HEIGHT }]}
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => handleTouch(e.nativeEvent)}
      onResponderMove={(e) => handleTouch(e.nativeEvent)}
      onResponderRelease={clearInspection}
      onResponderTerminate={clearInspection}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID="weight-trend-chart"
    >
      {layout && layout.width > 0 && (
        <Svg width={layout.width} height={CHART_HEIGHT} style={styles.svg}>
          <Defs>
            <LinearGradient id="weightTrendAreaFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={accentColor} stopOpacity="0.26" />
              <Stop offset="45%" stopColor={SYSTEM_ACCENT_NAVY_DEPTH} stopOpacity="0.10" />
              <Stop offset="100%" stopColor={SYSTEM_ACCENT_NAVY_DEPTH} stopOpacity="0.01" />
            </LinearGradient>
          </Defs>
          {/* Classification bands — square plot edges; one solid Weight-card color each. */}
          {visibleBands.map((band) => (
            <Rect
              key={`band-${band.id}`}
              x={plotLeft}
              y={band.y}
              width={plotWidth}
              height={band.height}
              fill={resolveWeightClassificationColor(band.tone)}
              pointerEvents="none"
            />
          ))}
          {visibleBands.slice(1).map((band) => (
            <Path
              key={`band-div-${band.id}`}
              d={`M ${plotLeft} ${band.y} L ${plotLeft + plotWidth} ${band.y}`}
              stroke={BAND_DIVIDER}
              strokeWidth={StyleSheet.hairlineWidth}
              fill="none"
              pointerEvents="none"
            />
          ))}
          {/* Soft area fill only when classification bands are absent. */}
          {areaD && visibleBands.length === 0 ? (
            <Path d={areaD} fill="url(#weightTrendAreaFill)" stroke="none" />
          ) : null}
          {/* Horizontal grid aligned to Y-axis ticks */}
          {yAxisTicks.map((tick) => {
            const y = toChartY(tick.valueKg);
            return (
              <Path
                key={`grid-${tick.label}`}
                d={`M ${plotLeft} ${y} L ${plotLeft + plotWidth} ${y}`}
                stroke={GRID_COLOR}
                strokeWidth={1}
                fill="none"
              />
            );
          })}
          {/* Square plot edge — light containment, no rounded corners. */}
          <Rect
            x={plotLeft}
            y={plotTop}
            width={plotWidth}
            height={chartHeight}
            fill="none"
            stroke={PLOT_EDGE_STROKE}
            strokeWidth={StyleSheet.hairlineWidth}
            pointerEvents="none"
          />
          {/* Y-axis tick labels — left of plot, 10 lb (or metric) increments */}
          {yAxisTicks.map((tick) => {
            const y = toChartY(tick.valueKg);
            return (
              <SvgText
                key={`ylab-${tick.label}`}
                x={4}
                y={y}
                fontSize={Y_LABEL_FONT_SIZE}
                fill={Y_LABEL_COLOR}
                textAnchor="start"
                alignmentBaseline="middle"
              >
                {tick.label}
              </SvgText>
            );
          })}
          {/* Soft elevated halo — restrained so the thin white core floats */}
          {pathD ? (
            <Path
              d={pathD}
              stroke={useHighContrastLine ? LINE_GLOW_SOFT : lineGlow}
              strokeWidth={LINE_SOFT_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {pathD ? (
            <Path
              d={pathD}
              stroke={lineGlow}
              strokeWidth={LINE_GLOW_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {/* Thin crisp white (or accent) core */}
          {pathD ? (
            <Path
              d={pathD}
              stroke={lineStroke}
              strokeWidth={LINE_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {/* Active vertical guide — always on latest at rest; moves while scrubbing. */}
          {guidePt != null ? (
            <>
              <Path
                d={`M ${guidePt.cx} ${plotTop} L ${guidePt.cx} ${plotBottom}`}
                stroke={CROSSHAIR_GLOW}
                strokeWidth={CROSSHAIR_GLOW_WIDTH}
                fill="none"
                strokeLinecap="round"
                pointerEvents="none"
              />
              <Path
                d={`M ${guidePt.cx} ${plotTop} L ${guidePt.cx} ${plotBottom}`}
                stroke={CROSSHAIR_COLOR}
                strokeWidth={CROSSHAIR_CORE_WIDTH}
                fill="none"
                strokeLinecap="round"
                pointerEvents="none"
              />
            </>
          ) : null}
          {/* Active / latest point marker (hero inspection — no floating tooltip). */}
          {guidePt != null ? (
            <>
              <Circle
                cx={guidePt.cx}
                cy={guidePt.cy}
                r={selected != null ? DOT_GLOW_R + 2 : DOT_GLOW_R}
                fill={lineGlow}
              />
              <Circle
                cx={guidePt.cx}
                cy={guidePt.cy}
                r={selected != null ? DOT_R + 1.25 : DOT_R}
                fill={pointFill}
                stroke={pointRing}
                strokeWidth={selected != null ? 2.25 : 2}
              />
            </>
          ) : null}
          {/* Month letters — evenly spaced for ≤1Y; omitted for 3Y / 5Y / All. */}
          {monthMarkers.map((marker) => (
            <SvgText
              key={`month-${marker.key}`}
              x={marker.x}
              y={monthLabelY}
              fontSize={MONTH_LETTER_SIZE}
              fill={MONTH_LETTER_COLOR}
              fontWeight="600"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {marker.letter}
            </SvgText>
          ))}
        </Svg>
      )}
      {outlierCount > 0 && (
        <Text style={styles.outlierNote} accessibilityLabel={`${outlierCount} outlier(s) clipped for readability`}>
          {outlierCount} outlier(s) clipped for readability
        </Text>
      )}
      {isSparse && n < 2 && (
        <Text style={styles.sparseNote} accessibilityLabel="Not enough weigh-ins in this range">
          Not enough weigh-ins in this range
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: DEFAULT_CHART_HEIGHT,
  },
  svg: {
    backgroundColor: "transparent",
  },
  outlierNote: {
    fontSize: 11,
    color: UI_TEXT_MUTED,
    marginTop: 6,
    fontStyle: "italic",
  },
  sparseNote: {
    fontSize: 11,
    color: UI_TEXT_MUTED,
    marginTop: 6,
  },
});
