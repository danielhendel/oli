import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { weightInUnit } from "@/lib/data/body/bodyWeightDailySeries";
import { monotonePathD } from "@/lib/ui/body/monotoneLinePath";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

const VIEW_W = 320;
const PAD = { left: 0, right: 6, top: 12, bottom: 12 } as const;
const LINE_WIDTH = 3.05;
const LINE_COLOR = SYSTEM_ACCENT;

export type BodyWeightLineColumn = {
  /** Axis label under the column (e.g. `"S"`, `"J"`). */
  label: string;
  /** Weight (kg) for the column; `null` when missing (line skips it gracefully). */
  valueKg: number | null;
  /** Strictly-future column (dimmed, never plotted). */
  isFuture?: boolean;
  /** Emphasized column (today / current month). */
  isCurrent?: boolean;
};

export type BodyWeightLineChartProps = {
  columns: readonly BodyWeightLineColumn[];
  unit: "kg" | "lb";
  /** Plot area height in px. */
  trackHeight?: number;
  testID?: string;
  accessibilityLabel?: string;
};

/**
 * Reusable weight **line** chart for the Body trend cards (This Week / yearly).
 *
 * - Evenly-spaced columns (one per label); the monotone-cubic line connects only columns with a
 *   value, so missing days/months are skipped without breaking the line.
 * - Blue ({@link SYSTEM_ACCENT}) line + soft area gradient, on the dark Activity card surface.
 * - Y axis shows min / mid / max in the display unit; X labels render one per column.
 */
export function BodyWeightLineChart({
  columns,
  unit,
  trackHeight = 160,
  testID = "body-weight-line-chart",
  accessibilityLabel,
}: BodyWeightLineChartProps) {
  const geometry = useMemo(() => {
    const n = Math.max(1, columns.length);
    const innerW = VIEW_W - PAD.left - PAD.right;
    const innerH = trackHeight - PAD.top - PAD.bottom;
    const xFor = (i: number) =>
      n === 1 ? PAD.left + innerW / 2 : PAD.left + (i / (n - 1)) * innerW;

    const present = columns
      .map((c, i) => ({ i, v: c.valueKg }))
      .filter((p): p is { i: number; v: number } => p.v != null && Number.isFinite(p.v));

    const values = present.map((p) => p.v);
    let yMin = values.length ? Math.min(...values) : 0;
    let yMax = values.length ? Math.max(...values) : 1;
    if (yMax - yMin < 0.6) {
      const mid = (yMin + yMax) / 2;
      yMin = mid - 0.6;
      yMax = mid + 0.6;
    } else {
      const pad = (yMax - yMin) * 0.18;
      yMin -= pad;
      yMax += pad;
    }
    const yRange = Math.max(0.1, yMax - yMin);
    const yFor = (w: number) => PAD.top + innerH - ((w - yMin) / yRange) * innerH;

    const linePoints = present.map((p) => ({ x: xFor(p.i), y: yFor(p.v) }));
    const linePath = monotonePathD(linePoints);
    const areaPath =
      linePoints.length >= 2
        ? `${linePath} L ${linePoints[linePoints.length - 1]!.x} ${yFor(yMin)} L ${linePoints[0]!.x} ${yFor(yMin)} Z`
        : "";

    const dots = present.map((p) => ({
      key: p.i,
      x: xFor(p.i),
      y: yFor(p.v),
      isCurrent: columns[p.i]?.isCurrent === true,
    }));

    return { yMin, yMax, linePath, areaPath, dots, hasLine: linePoints.length >= 2 };
  }, [columns, trackHeight]);

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
          viewBox={`0 0 ${VIEW_W} ${trackHeight}`}
          style={styles.svg}
        >
          <Defs>
            <LinearGradient id="bodyWeightLineArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.2} />
              <Stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {geometry.areaPath ? (
            <Path
              d={geometry.areaPath}
              fill="url(#bodyWeightLineArea)"
              stroke="none"
              testID={`${testID}-area`}
            />
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
          {geometry.dots.map((dot) => (
            <Circle
              key={`dot-${dot.key}`}
              cx={dot.x}
              cy={dot.y}
              r={dot.isCurrent ? 4.5 : 3.2}
              fill={LINE_COLOR}
              testID={`${testID}-dot-${dot.key}`}
            />
          ))}
        </Svg>
      </View>
      <View style={styles.xAxisRow} testID={`${testID}-labels`}>
        {columns.map((c, i) => (
          <View key={`lbl-${i}`} style={styles.xAxisLabelCol}>
            <Text style={[styles.xAxisLabel, c.isFuture && styles.xAxisLabelFuture]} numberOfLines={1}>
              {c.label}
            </Text>
          </View>
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
    width: 24,
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
  xAxisRow: {
    marginTop: 8,
    marginLeft: 24,
    marginRight: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    width: "auto",
  },
  xAxisLabelCol: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  xAxisLabel: {
    fontSize: 11,
    fontWeight: "400",
    color: "#AEAEB2",
    textAlign: "center",
  },
  xAxisLabelFuture: {
    color: "rgba(174,174,178,0.4)",
  },
});
