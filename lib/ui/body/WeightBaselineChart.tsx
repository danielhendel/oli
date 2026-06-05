import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { STEP_TIER_COLORS } from "@/lib/utils/activityStepTierVisual";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { monotonePathD } from "@/lib/ui/body/monotoneLinePath";

const CHART_H = 160;
const PAD = { left: 0, right: 6, top: 10, bottom: 14 } as const;
const LINE_WIDTH = 3.05;

export type WeightBaselineChartPoint = {
  observedAt: string;
  weightKg: number;
};

export type WeightBaselineXAxisLabel = {
  tMs: number;
  label: string;
  anchor: "start" | "middle" | "end";
};

type Props = {
  points: readonly WeightBaselineChartPoint[];
  lowKg: number;
  highKg: number;
  currentKg: number;
  yMinKg: number;
  yMaxKg: number;
  unit: "kg" | "lb";
  xAxisLabels: readonly WeightBaselineXAxisLabel[];
  classification: "maintaining" | "gaining" | "losing";
};

function bandColorForClassification(c: "maintaining" | "gaining" | "losing"): string {
  if (c === "gaining") return STEP_TIER_COLORS.great;
  if (c === "losing") return STEP_TIER_COLORS.low;
  return SYSTEM_ACCENT;
}

export function WeightBaselineChart({
  points,
  currentKg,
  yMinKg,
  yMaxKg,
  unit,
  xAxisLabels,
  classification,
}: Props) {
  const series = useMemo(() => {
    const s = points
      .map((p) => ({ t: Date.parse(p.observedAt), w: p.weightKg }))
      .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.w))
      .sort((a, b) => a.t - b.t);
    if (s.length === 0) {
      const now = Date.now();
      return [{ t: now - 1, w: currentKg }, { t: now, w: currentKg }];
    }
    if (s.length === 1) {
      const one = s[0]!;
      return [{ ...one, t: one.t - 1 }, one];
    }
    return s;
  }, [points, currentKg]);

  const tMin = series[0]!.t;
  const tMax = series[series.length - 1]!.t;
  const tRange = Math.max(1, tMax - tMin);
  const yMin = yMinKg;
  const yMax = yMaxKg;
  const yRange = Math.max(0.1, yMax - yMin);

  const innerW = 320 - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const toX = (t: number) => PAD.left + ((t - tMin) / tRange) * innerW;
  const toY = (w: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, w));
    return PAD.top + innerH - ((clamped - yMin) / yRange) * innerH;
  };
  const bandColor = bandColorForClassification(classification);
  const lineColor = bandColor;

  const linePoints = series.map((p) => ({ x: toX(p.t), y: toY(p.w) }));
  const linePath = monotonePathD(linePoints);
  const areaPath =
    linePoints.length >= 2
      ? `${linePath} L ${linePoints[linePoints.length - 1]!.x} ${toY(yMin)} L ${linePoints[0]!.x} ${toY(yMin)} Z`
      : "";

  const yTicksKg = [yMin, (yMin + yMax) / 2, yMax];

  return (
    <View style={styles.wrap} testID="weight-baseline-chart">
      <View style={styles.chartRow}>
        <View style={styles.yAxisCol} testID="weight-baseline-chart-y-axis">
          <Text style={styles.yAxisLabel}>{unit === "lb" ? "165" : yMax.toFixed(0)}</Text>
          <Text style={styles.yAxisLabel}>{unit === "lb" ? "160" : ((yMin + yMax) / 2).toFixed(0)}</Text>
          <Text style={styles.yAxisLabel}>{unit === "lb" ? "155" : yMin.toFixed(0)}</Text>
        </View>
        <Svg width="100%" height={CHART_H} viewBox={`0 0 320 ${CHART_H}`} style={styles.svg}>
        <Defs>
          <LinearGradient id="weightBaselineArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={lineColor} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {yTicksKg.map((tick) => {
          const y = toY(tick);
          return (
            <Path
              key={tick}
              d={`M ${PAD.left} ${y} L ${320 - PAD.right} ${y}`}
              stroke="rgba(60,60,67,0.06)"
              strokeWidth={1}
              fill="none"
            />
          );
        })}
        {areaPath ? <Path d={areaPath} fill="url(#weightBaselineArea)" stroke="none" testID="weight-baseline-chart-area" /> : null}
        <Path
          d={linePath}
          stroke={lineColor}
          strokeWidth={LINE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          testID="weight-baseline-chart-line"
        />
        </Svg>
      </View>
      <View style={styles.xAxisRow} testID="weight-baseline-chart-x-axis">
        {xAxisLabels.map((tick) => (
          <Text
            key={`${tick.tMs}-${tick.label}`}
            style={[
              styles.xAxisLabel,
              tick.anchor === "start"
                ? styles.xAxisLabelStart
                : tick.anchor === "end"
                  ? styles.xAxisLabelEnd
                  : styles.xAxisLabelMid,
            ]}
            numberOfLines={1}
          >
            {tick.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    backgroundColor: "transparent",
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "stretch",
    width: "100%",
  },
  yAxisCol: {
    width: 20,
    justifyContent: "space-between",
    paddingTop: PAD.top - 1,
    paddingBottom: PAD.bottom - 1,
    marginRight: 0,
  },
  yAxisLabel: {
    fontSize: 10,
    color: "rgba(60,60,67,0.52)",
    letterSpacing: -0.06,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  svg: {
    flex: 1,
  },
  xAxisRow: {
    marginTop: 6,
    marginLeft: 20,
    marginRight: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  xAxisLabel: {
    fontSize: 11,
    color: "rgba(60,60,67,0.62)",
    letterSpacing: -0.08,
    flexShrink: 1,
  },
  xAxisLabelStart: { textAlign: "left" },
  xAxisLabelMid: { textAlign: "center" },
  xAxisLabelEnd: { textAlign: "right" },
});

