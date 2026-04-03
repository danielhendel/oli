// lib/ui/ExerciseProgressChart.tsx — e1RM progress over sessions (react-native-svg). Used on exercise-history.

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

const PADDING = { left: 40, right: 8, top: 8, bottom: 36 };
const CHART_HEIGHT = 160;
const LB_PER_KG = 2.2046226218;

const LINE_COLOR = SYSTEM_ACCENT;
const LINE_WIDTH = 2;
const DOT_R = 4;
const GRID_COLOR = "#E5E5EA";
const LABEL_COLOR = "#4A4A4F";
const FONT_SIZE = 11;
/** Minimum Y span (lb) so a flat line doesn't look exaggerated. */
const MIN_SPAN_LB = 10;
const MIN_PAD_LB = 2;

export type ExerciseProgressPoint = {
  /** Session date (ISO); used for X-axis and ordering. */
  dateIso: string;
  /** Value in kg (e.g. best e1RM for that session). */
  valueKg: number;
};

/** Monotone cubic path through points (no overshoot). */
function monotonePathD(points: { cx: number; cy: number }[]): string {
  if (points.length < 2) return "";
  const m = points.length;
  const x = points.map((p) => p.cx);
  const y = points.map((p) => p.cy);
  const d: number[] = [];
  for (let i = 0; i < m - 1; i++) {
    const dx = x[i + 1]! - x[i]!;
    d.push(Math.abs(dx) < 1e-10 ? 0 : (y[i + 1]! - y[i]!) / dx);
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
    path += ` C ${x[i]! + dx / 3} ${y[i]! + (tangents[i] ?? 0) * (dx / 3)}, ${x[i + 1]! - dx / 3} ${y[i + 1]! - (tangents[i + 1] ?? 0) * (dx / 3)}, ${x[i + 1]} ${y[i + 1]}`;
  }
  return path;
}

export type ExerciseProgressChartProps = {
  /** Points in chronological order (oldest first) for X-axis. */
  points: ExerciseProgressPoint[];
  /** When true, chart is not rendered; caller shows placeholder. */
  showPlaceholder?: boolean;
  /** Placeholder text when &lt; 2 points; default: e1RM trend message. */
  placeholderMessage?: string;
  /** Line and dot color; default: system blue. */
  lineColor?: string;
};

const DEFAULT_PLACEHOLDER = "Log more sessions to see e1RM trend";

export function ExerciseProgressChart({
  points,
  showPlaceholder = false,
  placeholderMessage = DEFAULT_PLACEHOLDER,
  lineColor = LINE_COLOR,
}: ExerciseProgressChartProps) {
  const [layout, setLayout] = useState<{ width: number } | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    setLayout({ width });
  };

  const validPoints = useMemo(() => {
    const out: { dateIso: string; valueKg: number; tMs: number }[] = [];
    for (const p of points) {
      const tMs = Date.parse(p.dateIso);
      if (!Number.isFinite(tMs)) continue;
      out.push({ dateIso: p.dateIso, valueKg: p.valueKg, tMs });
    }
    return out.sort((a, b) => a.tMs - b.tMs);
  }, [points]);

  if (showPlaceholder || validPoints.length < 2) {
    return (
      <View
        style={styles.placeholder}
        onLayout={onLayout}
        testID="exercise-progress-chart"
        accessibilityLabel="Progress chart placeholder"
      >
        <Text style={styles.placeholderText}>
          {validPoints.length < 2
            ? placeholderMessage
            : "Not enough data to show trend"}
        </Text>
      </View>
    );
  }

  const chartWidth = layout ? Math.max(0, layout.width - PADDING.left - PADDING.right) : 0;
  const chartHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const minT = validPoints[0]!.tMs;
  const maxT = validPoints[validPoints.length - 1]!.tMs;
  const rangeT = maxT - minT || 1;
  const valuesLb = validPoints.map((p) => p.valueKg * LB_PER_KG);
  const minV = Math.min(...valuesLb);
  const maxV = Math.max(...valuesLb);
  const span = maxV - minV || 0.1;
  const pad = Math.max(MIN_PAD_LB, span * 0.05);
  let displayMin = minV - pad;
  let displayMax = maxV + pad;
  if (displayMax - displayMin < MIN_SPAN_LB) {
    const mid = (displayMin + displayMax) / 2;
    displayMin = mid - MIN_SPAN_LB / 2;
    displayMax = mid + MIN_SPAN_LB / 2;
  }
  const rangeY = displayMax - displayMin || 0.1;

  const toX = (tMs: number) => PADDING.left + ((tMs - minT) / rangeT) * chartWidth;
  const toY = (lb: number) =>
    PADDING.top + chartHeight - ((lb - displayMin) / rangeY) * chartHeight;

  const pointsWithCoords = validPoints.map((p) => ({
    ...p,
    cx: toX(p.tMs),
    cy: toY(p.valueKg * LB_PER_KG),
  }));

  const pathD = monotonePathD(pointsWithCoords);
  const highLabel = maxV.toFixed(0);
  const lowLabel = minV.toFixed(0);
  const yHigh = toY(maxV);
  const yLow = toY(minV);

  const formatDateShort = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "—";
    }
  };

  if (!layout || layout.width <= 0) {
    return (
      <View
        style={styles.container}
        onLayout={onLayout}
        testID="exercise-progress-chart"
        accessibilityLabel="e1RM progress chart"
      >
        <View style={[styles.chartArea, { height: CHART_HEIGHT }]} />
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      onLayout={onLayout}
      testID="exercise-progress-chart"
      accessibilityLabel="e1RM progress chart"
      accessibilityRole="none"
    >
      <Svg width={layout.width} height={CHART_HEIGHT} style={styles.svg}>
        {/* Grid */}
        {[0.25, 0.5, 0.75].map((frac) => (
          <Path
            key={frac}
            d={`M ${PADDING.left} ${PADDING.top + chartHeight * (1 - frac)} L ${layout.width - PADDING.right} ${PADDING.top + chartHeight * (1 - frac)}`}
            stroke={GRID_COLOR}
            strokeWidth={1}
            fill="none"
          />
        ))}
        {/* Y labels */}
        <SvgText x={4} y={yHigh} fontSize={FONT_SIZE} fill={LABEL_COLOR} textAnchor="start" alignmentBaseline="middle">
          {highLabel}
        </SvgText>
        <SvgText x={4} y={yLow} fontSize={FONT_SIZE} fill={LABEL_COLOR} textAnchor="start" alignmentBaseline="middle">
          {lowLabel}
        </SvgText>
        {/* Line */}
        {pathD ? (
          <Path
            d={pathD}
            stroke={lineColor}
            strokeWidth={LINE_WIDTH}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {/* Dots at each point */}
        {pointsWithCoords.map((p, i) => (
          <Circle key={i} cx={p.cx} cy={p.cy} r={DOT_R} fill={lineColor} />
        ))}
        {/* X labels: first and last */}
        <SvgText
          x={PADDING.left}
          y={CHART_HEIGHT - 10}
          fontSize={FONT_SIZE}
          fill={LABEL_COLOR}
          textAnchor="start"
        >
          {formatDateShort(validPoints[0]!.dateIso)}
        </SvgText>
        <SvgText
          x={layout.width - PADDING.right}
          y={CHART_HEIGHT - 10}
          fontSize={FONT_SIZE}
          fill={LABEL_COLOR}
          textAnchor="end"
        >
          {formatDateShort(validPoints[validPoints.length - 1]!.dateIso)}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: CHART_HEIGHT },
  svg: { backgroundColor: "transparent" },
  chartArea: { width: "100%" },
  placeholder: {
    minHeight: CHART_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: "#6E6E73",
    textAlign: "center",
  },
});
