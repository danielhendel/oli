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
import {
  buildWeightAxisTicks,
  type WeightAxisTicksModel,
} from "@/lib/body/presentation/buildWeightAxisTicks";
import type { BodyFatAxisTicksModel } from "@/lib/body/presentation/buildBodyFatAxisTicks";
import { buildBodyFatAxisTicks } from "@/lib/body/presentation/buildBodyFatAxisTicks";
import {
  buildWeightTrendXAxisTicks,
  type WeightXAxisTick,
} from "@/lib/body/presentation/buildWeightTrendXAxisTicks";
import {
  buildWeightTrendXScale,
  mapWeightTrendTimeToScreenX,
} from "@/lib/body/presentation/buildWeightTrendXScale";
import { resolveWeightTrendYDomain } from "@/lib/body/presentation/resolveWeightTrendYDomain";
import type { WeightPoint, WeightRangeKey } from "@/lib/data/useWeightSeries";
import {
  buildWeightTrendCurvePath,
  WEIGHT_TREND_CURVE_MODE,
} from "@/lib/ui/body/weightTrendCurvePath";
import {
  SYSTEM_ACCENT_LUMINOUS,
  SYSTEM_ACCENT_LUMINOUS_GLOW,
  SYSTEM_ACCENT_NAVY_DEPTH,
} from "@/lib/ui/theme/systemAccent";
import { WEIGHT_TREND_STROKE_VISUAL } from "@/lib/ui/theme/weightTrendStrokeVisual";
import { UI_SCREEN_BG } from "@/lib/ui/theme/uiTokens";

/**
 * Plot inset — Y labels on the RIGHT; left keeps modest room so x-labels never clip.
 * Bottom reserves room for range-aware x-axis labels.
 */
export const WEIGHT_TREND_CHART_PADDING = { left: 10, right: 40, top: 14, bottom: 32 };
const PADDING = WEIGHT_TREND_CHART_PADDING;
const Y_LABEL_FONT_SIZE = 11;
const Y_LABEL_COLOR = UI_TEXT_MUTED;
/** Right-edge inset for Y tick text (textAnchor end). */
const Y_LABEL_RIGHT_INSET = 4;
/** Hero chart height — visually dominant on Weight detail. */
const DEFAULT_CHART_HEIGHT = 320;
const DOT_R = 5;
/** Soft point wash — kept small so it does not reintroduce line fuzz. */
const DOT_GLOW_R = 8;
const PLOT_EDGE_STROKE = "rgba(255,255,255,0.14)";
/** Near-black plot field — blends with Weight detail canvas (`UI_SCREEN_BG`). */
const PLOT_BG = UI_SCREEN_BG;
const X_LABEL_COLOR = "rgba(190, 206, 228, 0.82)";
const X_LABEL_SIZE = 10;

const ACCENT_BLUE = SYSTEM_ACCENT_LUMINOUS;
/** High-contrast Weight trend — one crisp core + one low-opacity halo (no stacked blur). */
const LINE_CORE_BLUE = WEIGHT_TREND_STROKE_VISUAL.coreColor;
const LINE_HALO_BLUE = WEIGHT_TREND_STROKE_VISUAL.haloColor;
const LINE_WIDTH = WEIGHT_TREND_STROKE_VISUAL.coreWidth;
const LINE_HALO_WIDTH = WEIGHT_TREND_STROKE_VISUAL.haloWidth;
/** Thin light-blue active guide — distinct from gray dotted vertical grid. */
const ACTIVE_GUIDE_COLOR = WEIGHT_TREND_STROKE_VISUAL.activeGuideColor;
const ACTIVE_GUIDE_WIDTH = WEIGHT_TREND_STROKE_VISUAL.activeGuideWidth;
/** Grid uses the same gray family as axis labels — visible over classification bands. */
const GRID_H_COLOR = "rgba(190, 206, 228, 0.55)";
const GRID_H_WIDTH = 1.25;
const GRID_V_COLOR = "rgba(190, 206, 228, 0.48)";
const GRID_V_WIDTH = 1.25;
const GRID_V_DASH = "2 3.5";
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
  valueKind?: "mass" | "generic" | "percent";
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
   * Crisp bright-blue core + single low-opacity blue halo — preferred for
   * Weight / Body Fat detail on the plain dark plot (reads blue-first, not blurry).
   */
  highContrastLine?: boolean;
  /**
   * Locked mass Y-axis from full Weight history (shared across all period selectors).
   * When set, period switching must not rescale ticks.
   */
  sharedMassAxis?: WeightAxisTicksModel | null;
  /**
   * Locked Body Fat % Y-axis from full available history (shared across all period selectors).
   */
  sharedPercentAxis?: BodyFatAxisTicksModel | null;
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
  highContrastLine = false,
  sharedMassAxis = null,
  sharedPercentAxis = null,
}: WeightTrendChartProps) {
  void _formatValue;
  const CHART_HEIGHT = chartHeightProp;
  const useHighContrastLine = highContrastLine;
  const lineStroke = useHighContrastLine ? LINE_CORE_BLUE : accentColor;
  const lineHalo = useHighContrastLine ? LINE_HALO_BLUE : SYSTEM_ACCENT_LUMINOUS_GLOW;
  const lineHaloWidth = useHighContrastLine ? LINE_HALO_WIDTH : 5;
  const pointFill = useHighContrastLine ? LINE_CORE_BLUE : accentColor;
  /** Crisp white rim keeps the blue disk readable on the dark plot. */
  const pointRing = "#FFFFFF";
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
  const padBottom = 30;
  const chartHeight = CHART_HEIGHT - PADDING.top - padBottom;

  const minT = Math.min(...processed.map((p) => p.x));
  const maxT = Math.max(...processed.map((p) => p.x));

  const useSharedMassAxis =
    sharedMassAxis != null &&
    sharedMassAxis.status === "ready" &&
    valueKind === "mass";

  const useSharedPercentAxis =
    sharedPercentAxis != null &&
    sharedPercentAxis.status === "ready" &&
    valueKind === "percent";

  const { displayMin, displayMax, outlierCount } = useSharedMassAxis
    ? {
        displayMin: sharedMassAxis.domainMinKg,
        displayMax: sharedMassAxis.domainMaxKg,
        outlierCount: processed.filter(
          (p) =>
            p.weightKg < sharedMassAxis.domainMinKg ||
            p.weightKg > sharedMassAxis.domainMaxKg,
        ).length,
      }
    : useSharedPercentAxis
      ? {
          displayMin: sharedPercentAxis.domainMinPercent,
          displayMax: sharedPercentAxis.domainMaxPercent,
          outlierCount: processed.filter(
            (p) =>
              p.weightKg < sharedPercentAxis.domainMinPercent ||
              p.weightKg > sharedPercentAxis.domainMaxPercent,
          ).length,
        }
      : resolveWeightTrendYDomain({
          valuesKg: processed.map((p) => p.weightKg),
          valueKind: valueKind === "percent" ? "generic" : valueKind,
          unitLabel,
        });

  const massAxis = useSharedMassAxis
    ? sharedMassAxis
    : valueKind === "mass" && (unitLabel === "lb" || unitLabel === "kg")
      ? buildWeightAxisTicks({
          minKg: Math.min(...processed.map((p) => p.weightKg)),
          maxKg: Math.max(...processed.map((p) => p.weightKg)),
          unit: unitLabel,
        })
      : null;

  const percentAxis = useSharedPercentAxis
    ? sharedPercentAxis
    : valueKind === "percent"
      ? buildBodyFatAxisTicks({
          minPercent: Math.min(...processed.map((p) => p.weightKg)),
          maxPercent: Math.max(...processed.map((p) => p.weightKg)),
        })
      : null;

  const rangeDisplay = displayMax - displayMin || 0.1;

  const plotLeft = PADDING.left;
  const plotWidth = Math.max(0, chartWidth);

  /**
   * 1) Domain scale seeds tick drafts.
   * 2) Even label slots become layout anchors.
   * 3) Shared X-scale maps all points / guide through those anchors.
   */
  const domainScale = buildWeightTrendXScale({
    range,
    domainStartMs: minT,
    domainEndMs: maxT,
  });
  const xAxisTicks: readonly WeightXAxisTick[] =
    layout && layout.width > 0 && plotWidth > 0
      ? buildWeightTrendXAxisTicks({
          range,
          scale: domainScale,
          plotWidthPx: plotWidth,
        })
      : [];
  const xScale = buildWeightTrendXScale({
    range,
    domainStartMs: minT,
    domainEndMs: maxT,
    layoutAnchors: xAxisTicks.map((t) => ({
      atMs: t.atMs,
      layoutNormalizedX: t.layoutNormalizedX,
    })),
  });

  const toChartX = (tMs: number) =>
    mapWeightTrendTimeToScreenX(tMs, xScale, plotLeft, plotWidth);
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

  /** One shared path for core + halo — linear segments (no cubic waviness). */
  const pathD = (() => {
    if (renderPoints.length < 2) return "";
    return buildWeightTrendCurvePath(
      renderPoints.map((p) => ({ x: p.cx, y: p.cy })),
      WEIGHT_TREND_CURVE_MODE,
    );
  })();

  const baselineY = PADDING.top + chartHeight;

  /** Generic (non-mass) fallback labels at observed high/low. */
  const actualMinW =
    processed.length > 0 ? Math.min(...processed.map((p) => p.weightKg)) : displayMin;
  const actualMaxW =
    processed.length > 0 ? Math.max(...processed.map((p) => p.weightKg)) : displayMax;
  const genericHighLabel = actualMaxW.toFixed(1);
  const genericLowLabel = actualMinW.toFixed(1);

  /** Area fill only when >= 3 points; sparse windows must not show filled triangle. */
  const areaD =
    !isSparse && renderPoints.length >= 2
      ? `${pathD} L ${renderPoints[renderPoints.length - 1]!.cx} ${baselineY} L ${renderPoints[0]!.cx} ${baselineY} Z`
      : "";

  const yAxisTicks =
    massAxis?.status === "ready"
      ? massAxis.ticks.map((t) => ({ valueKg: t.valueKg, label: t.label }))
      : percentAxis?.status === "ready"
        ? percentAxis.ticks.map((t) => ({
            valueKg: t.valuePercent,
            label: t.label,
          }))
        : [
            { valueKg: actualMaxW, label: genericHighLabel },
            { valueKg: actualMinW, label: genericLowLabel },
          ].filter((t, i, arr) => i === 0 || t.label !== arr[0]!.label);

  /** Nearest plotted screen-X — same mapping as line / guide / x-axis ticks. */
  const handleTouch = useCallback(
    (ev: { locationX: number }) => {
      if (chartWidth <= 0 || pointsWithCoords.length === 0) return;
      const touchX = ev.locationX;
      let best = 0;
      let bestDist = Math.abs(pointsWithCoords[0]!.cx - touchX);
      for (let i = 1; i < pointsWithCoords.length; i++) {
        const d = Math.abs(pointsWithCoords[i]!.cx - touchX);
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
    [chartWidth, pointsWithCoords],
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

  const plotTop = PADDING.top;
  const plotBottom = PADDING.top + chartHeight;
  const yLabelX = (layout?.width ?? 0) - Y_LABEL_RIGHT_INSET;

  const xLabelY = plotBottom + 14;

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
          {/* Plain dark plot field — classification colors live on the Body Weight card. */}
          <Rect
            x={plotLeft}
            y={plotTop}
            width={plotWidth}
            height={chartHeight}
            fill={PLOT_BG}
            pointerEvents="none"
          />
          {/* Soft area fill only for non–high-contrast (non-Weight) metrics. */}
          {areaD && !useHighContrastLine ? (
            <Path d={areaD} fill="url(#weightTrendAreaFill)" stroke="none" />
          ) : null}
          {/* Horizontal grid — solid, aligned to Y ticks */}
          {yAxisTicks.map((tick) => {
            const y = toChartY(tick.valueKg);
            return (
              <Path
                key={`hgrid-${tick.label}`}
                d={`M ${plotLeft} ${y} L ${plotLeft + plotWidth} ${y}`}
                stroke={GRID_H_COLOR}
                strokeWidth={GRID_H_WIDTH}
                fill="none"
              />
            );
          })}
          {/* Vertical grid — dotted, aligned to even x-label layout slots */}
          {xAxisTicks
            .filter((t) => t.showGridLine)
            .map((tick) => {
              const x = plotLeft + tick.layoutNormalizedX * plotWidth;
              return (
                <Path
                  key={`vgrid-${tick.atMs}-${tick.label}`}
                  d={`M ${x} ${plotTop} L ${x} ${plotBottom}`}
                  stroke={GRID_V_COLOR}
                  strokeWidth={GRID_V_WIDTH}
                  strokeDasharray={GRID_V_DASH}
                  fill="none"
                  pointerEvents="none"
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
          {/* Y-axis tick labels — RIGHT of plot, 10 lb (or metric) increments */}
          {yAxisTicks.map((tick) => {
            const y = toChartY(tick.valueKg);
            return (
              <SvgText
                key={`ylab-${tick.label}`}
                x={yLabelX}
                y={y}
                fontSize={Y_LABEL_FONT_SIZE}
                fill={Y_LABEL_COLOR}
                textAnchor="end"
                alignmentBaseline="middle"
              >
                {tick.label}
              </SvgText>
            );
          })}
          {/* Single low-opacity blue halo — elevation without stacked blur */}
          {pathD ? (
            <Path
              d={pathD}
              stroke={lineHalo}
              strokeWidth={lineHaloWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
          ) : null}
          {/* Crisp opaque blue (or accent) core — no blur on this stroke */}
          {pathD ? (
            <Path
              d={pathD}
              stroke={lineStroke}
              strokeWidth={LINE_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
          ) : null}
          {/* Active vertical guide — thin light blue; above line, below point. */}
          {guidePt != null ? (
            <Path
              d={`M ${guidePt.cx} ${plotTop} L ${guidePt.cx} ${plotBottom}`}
              stroke={ACTIVE_GUIDE_COLOR}
              strokeWidth={ACTIVE_GUIDE_WIDTH}
              fill="none"
              strokeLinecap="round"
              pointerEvents="none"
            />
          ) : null}
          {/* Active / latest point marker (hero inspection — no floating tooltip). */}
          {guidePt != null ? (
            <>
              <Circle
                cx={guidePt.cx}
                cy={guidePt.cy}
                r={selected != null ? DOT_GLOW_R + 1.5 : DOT_GLOW_R}
                fill={lineHalo}
                pointerEvents="none"
              />
              <Circle
                cx={guidePt.cx}
                cy={guidePt.cy}
                r={selected != null ? DOT_R + 1.25 : DOT_R}
                fill={pointFill}
                stroke={pointRing}
                strokeWidth={selected != null ? 2.25 : 2}
                pointerEvents="none"
              />
            </>
          ) : null}
          {/* Range-aware x-axis labels — even visual slots; same positions as vertical grid. */}
          {xAxisTicks
            .filter((t) => t.showLabel)
            .map((tick) => (
              <SvgText
                key={`xlabel-${tick.atMs}-${tick.label}`}
                x={plotLeft + tick.layoutNormalizedX * plotWidth}
                y={xLabelY}
                fontSize={X_LABEL_SIZE}
                fill={X_LABEL_COLOR}
                fontWeight="600"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {tick.label}
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
