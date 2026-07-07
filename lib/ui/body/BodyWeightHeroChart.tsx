import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import type {
  WeightHeroAxisTick,
  WeightHeroChartPoint,
  WeightHeroTargetBandKg,
} from "@/lib/body/weightTrendViewModel";
import { weightInUnit } from "@/lib/data/body/bodyWeightDailySeries";
import { monotonePathD } from "@/lib/ui/body/monotoneLinePath";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

const VIEW_W = 320;
const Y_AXIS_W = 24;
const PAD = { left: 0, right: 6, top: 12, bottom: 8 } as const;
const X_AXIS_HEIGHT = 22;
const LINE_WIDTH = 3.05;
const LINE_COLOR = SYSTEM_ACCENT;
const TARGET_BAND_FILL = "rgba(52, 199, 89, 0.12)";
const GRID_COLOR = "rgba(235,235,245,0.08)";

export type BodyWeightHeroChartProps = {
  points: readonly WeightHeroChartPoint[];
  axisTicks: readonly WeightHeroAxisTick[];
  unit: "kg" | "lb";
  targetBandKg?: WeightHeroTargetBandKg | null;
  trackHeight?: number;
  testID?: string;
  accessibilityLabel?: string;
};

/**
 * Hero weight trend chart — time-ordered daily points with positioned axis ticks (not per-point
 * flex columns), optional healthy-weight band, and an emphasized today dot.
 */
export function BodyWeightHeroChart({
  points,
  axisTicks,
  unit,
  targetBandKg = null,
  trackHeight = 160,
  testID = "body-weight-hero-chart",
  accessibilityLabel,
}: BodyWeightHeroChartProps) {
  const plotWidth = VIEW_W - Y_AXIS_W - PAD.right;

  const geometry = useMemo(() => {
    const n = Math.max(1, points.length);
    const innerW = plotWidth - PAD.left;
    const innerH = trackHeight - PAD.top - PAD.bottom;
    const xFor = (i: number) =>
      n === 1 ? PAD.left + innerW / 2 : PAD.left + (i / (n - 1)) * innerW;

    const values = points.map((p) => p.weightKg);
    let yMin = values.length ? Math.min(...values) : 0;
    let yMax = values.length ? Math.max(...values) : 1;

    if (targetBandKg != null) {
      yMin = Math.min(yMin, targetBandKg.loKg);
      yMax = Math.max(yMax, targetBandKg.hiKg);
    }

    if (yMax - yMin < 0.6) {
      const mid = (yMin + yMax) / 2;
      yMin = mid - 0.6;
      yMax = mid + 0.6;
    } else {
      const pad = (yMax - yMin) * 0.14;
      yMin -= pad;
      yMax += pad;
    }

    const yRange = Math.max(0.1, yMax - yMin);
    const yFor = (w: number) => PAD.top + innerH - ((w - yMin) / yRange) * innerH;

    const linePoints = points.map((p, i) => ({ x: xFor(i), y: yFor(p.weightKg) }));
    const linePath = linePoints.length >= 2 ? monotonePathD(linePoints) : "";
    const areaPath =
      linePoints.length >= 2
        ? `${linePath} L ${linePoints[linePoints.length - 1]!.x} ${yFor(yMin)} L ${linePoints[0]!.x} ${yFor(yMin)} Z`
        : "";

    const targetBand =
      targetBandKg != null
        ? {
            yTop: yFor(targetBandKg.hiKg),
            yBottom: yFor(targetBandKg.loKg),
            x: PAD.left,
            width: innerW,
            height: Math.max(1, yFor(targetBandKg.loKg) - yFor(targetBandKg.hiKg)),
          }
        : null;

    const midY = yFor((yMin + yMax) / 2);

    return {
      yMin,
      yMax,
      linePath,
      areaPath,
      linePoints,
      targetBand,
      midY,
      innerW,
      hasLine: linePoints.length >= 2,
    };
  }, [points, trackHeight, targetBandKg, plotWidth]);

  const yTicks = [geometry.yMax, (geometry.yMin + geometry.yMax) / 2, geometry.yMin];

  return (
    <View
      style={styles.wrap}
      testID={testID}
      {...(accessibilityLabel != null ? { accessible: true, accessibilityLabel } : {})}
    >
      <View style={styles.chartRow}>
        <View style={styles.yAxisCol} testID={`${testID}-y-axis`}>
          {yTicks.map((tick, idx) => (
            <Text key={`y-${idx}`} style={styles.yAxisLabel} numberOfLines={1}>
              {weightInUnit(tick, unit).toFixed(0)}
            </Text>
          ))}
        </View>
        <Svg
          width="100%"
          height={trackHeight}
          viewBox={`0 0 ${plotWidth} ${trackHeight}`}
          style={styles.svg}
        >
          <Defs>
            <LinearGradient id="bodyWeightHeroArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.22} />
              <Stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path
            d={`M ${PAD.left} ${geometry.midY} L ${PAD.left + geometry.innerW} ${geometry.midY}`}
            stroke={GRID_COLOR}
            strokeWidth={1}
            fill="none"
          />
          {geometry.targetBand != null ? (
            <Rect
              x={geometry.targetBand.x}
              y={geometry.targetBand.yTop}
              width={geometry.targetBand.width}
              height={geometry.targetBand.height}
              fill={TARGET_BAND_FILL}
              testID={`${testID}-target-band`}
            />
          ) : null}
          {geometry.areaPath ? (
            <Path d={geometry.areaPath} fill="url(#bodyWeightHeroArea)" stroke="none" testID={`${testID}-area`} />
          ) : null}
          {geometry.hasLine ? (
            <Path
              d={geometry.linePath}
              stroke={LINE_COLOR}
              strokeWidth={LINE_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              testID={`${testID}-line`}
            />
          ) : null}
          {geometry.linePoints.map((dot, i) => {
            const pt = points[i]!;
            return (
              <Circle
                key={`dot-${pt.dayKey}`}
                cx={dot.x}
                cy={dot.y}
                r={pt.isToday ? 5 : 3}
                fill={LINE_COLOR}
                stroke={pt.isToday ? "rgba(255,255,255,0.9)" : "none"}
                strokeWidth={pt.isToday ? 2 : 0}
                testID={`${testID}-dot-${i}`}
              />
            );
          })}
        </Svg>
      </View>
      <View
        style={[styles.xAxisTrack, { marginLeft: Y_AXIS_W, marginRight: PAD.right }]}
        testID={`${testID}-labels`}
      >
        {axisTicks.map((tick, index) => (
          <Text
            key={`tick-${index}-${tick.label}`}
            style={[
              styles.xAxisLabel,
              {
                left: `${tick.position * 100}%`,
              },
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
    paddingBottom: 2,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "stretch",
    width: "100%",
  },
  yAxisCol: {
    width: Y_AXIS_W,
    justifyContent: "space-between",
    paddingTop: PAD.top - 1,
    paddingBottom: PAD.bottom - 1,
  },
  yAxisLabel: {
    fontSize: 10,
    color: "rgba(235,235,245,0.45)",
    letterSpacing: -0.06,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  svg: {
    flex: 1,
  },
  xAxisTrack: {
    position: "relative",
    marginTop: 10,
    height: X_AXIS_HEIGHT,
    width: "auto",
  },
  xAxisLabel: {
    position: "absolute",
    top: 0,
    width: 44,
    marginLeft: -22,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
    color: "rgba(235,235,245,0.78)",
    textAlign: "center",
  },
});
