import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import type { WeeklyEnergyChartPoint } from "@/lib/data/dash/buildWeeklyEnergyVm";
import { formatWeekdayFullFromDayKey } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import { UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";
import type { DayKey } from "@/lib/ui/calendar/types";

const BAR_RADIUS = 6;
const ENERGY_RANGE_BAR_FILL = "#4F7CFF";
const BAR_DIM_OPACITY_NON_TODAY = 0.74;
const ANIM_MS = 260;
const MIN_RANGE_HEIGHT_PX = 6;

/** Vertical room reserved above the bar track for the high-kcal label. */
const LABEL_OVERHEAD_TOP_PX = 18;
/** Vertical room reserved below the bar track for the low-kcal label. */
const LABEL_OVERHEAD_BOTTOM_PX = 18;
/** Gap between a bar end and its anchored value label. */
const LABEL_TO_BAR_GAP_PX = 3;
/** Approx rendered height of a value label line (fontSize 10 + leading). */
const LABEL_LINE_HEIGHT_PX = 13;
/** Below this bar pixel height we collapse to a single (high-only) label to prevent overlap. */
const BOTH_LABELS_MIN_BAR_HEIGHT_PX = LABEL_LINE_HEIGHT_PX * 2 + LABEL_TO_BAR_GAP_PX * 2 + 4;

/** Total vertical room reserved for value labels above and below the bar track. */
export const ENERGY_RANGE_BAR_LABEL_OVERHEAD_PX =
  LABEL_OVERHEAD_TOP_PX + LABEL_OVERHEAD_BOTTOM_PX;

type EnergyWeeklyRangeBarsProps = {
  points: readonly WeeklyEnergyChartPoint[];
  barTrackHeight: number;
  chartMin: number;
  chartMax: number;
  todayDayKey: DayKey;
};

function formatKcalShort(value: number): string {
  return Math.round(value).toLocaleString();
}

function barStackOpacity(isFutureDay: boolean, hasRange: boolean): number {
  if (isFutureDay) return 0.22;
  if (!hasRange) return 0.3;
  return 1;
}

function rangeLayout(
  low: number,
  high: number,
  chartMin: number,
  chartMax: number,
  trackHeight: number,
): { bottomPx: number; heightPx: number } {
  const span = Math.max(chartMax - chartMin, 1);
  const bottomPx = Math.round(((low - chartMin) / span) * trackHeight);
  const heightPx = Math.max(MIN_RANGE_HEIGHT_PX, Math.round(((high - low) / span) * trackHeight));
  const cappedBottom = Math.min(trackHeight - MIN_RANGE_HEIGHT_PX, Math.max(0, bottomPx));
  const cappedHeight = Math.min(trackHeight - cappedBottom, heightPx);
  return { bottomPx: cappedBottom, heightPx: cappedHeight };
}

export function EnergyWeeklyRangeBars({
  points,
  barTrackHeight,
  chartMin,
  chartMax,
  todayDayKey,
}: EnergyWeeklyRangeBarsProps) {
  const targetHeights = useMemo(
    () =>
      points.map((p) => {
        if (p.low == null || p.high == null) return 0;
        return rangeLayout(p.low, p.high, chartMin, chartMax, barTrackHeight).heightPx;
      }),
    [points, chartMin, chartMax, barTrackHeight],
  );

  const skipAnim = typeof process.env.JEST_WORKER_ID !== "undefined";
  const animsRef = useRef<Animated.Value[]>([]);
  if (animsRef.current.length !== targetHeights.length) {
    animsRef.current = targetHeights.map((t) => new Animated.Value(skipAnim ? t : 0));
  }

  const heightSig = targetHeights.join(",");

  useEffect(() => {
    targetHeights.forEach((target, i) => {
      const v = animsRef.current[i];
      if (!v) return;
      if (skipAnim) {
        v.setValue(target);
        return;
      }
      v.setValue(0);
      Animated.timing(v, {
        toValue: target,
        duration: ANIM_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    });
  }, [heightSig, skipAnim]);

  const columnHeight = barTrackHeight + LABEL_OVERHEAD_TOP_PX + LABEL_OVERHEAD_BOTTOM_PX;

  return (
    <View style={styles.outer} testID="energy-this-week-weekly-chart">
      <View style={[styles.trackWrap, { height: columnHeight }]}>
        <View style={styles.barsRow}>
          {points.map((p, i) => {
            const isToday = p.dayKey === todayDayKey;
            const hasRange = p.low != null && p.high != null;
            const opacity = barStackOpacity(p.isFutureDay, hasRange);
            const barOpacity = isToday ? opacity : opacity * BAR_DIM_OPACITY_NON_TODAY;
            const anim = animsRef.current[i]!;
            const layout =
              hasRange && p.low != null && p.high != null
                ? rangeLayout(p.low, p.high, chartMin, chartMax, barTrackHeight)
                : null;

            const showLabels = hasRange && !p.isFutureDay && layout != null;
            const showLowLabel =
              showLabels && layout != null && layout.heightPx >= BOTH_LABELS_MIN_BAR_HEIGHT_PX;

            const barBottomInCol = layout != null ? LABEL_OVERHEAD_BOTTOM_PX + layout.bottomPx : 0;
            const highLabelBottom =
              layout != null
                ? barBottomInCol + layout.heightPx + LABEL_TO_BAR_GAP_PX
                : 0;
            const lowLabelBottom =
              layout != null
                ? Math.max(0, barBottomInCol - LABEL_TO_BAR_GAP_PX - LABEL_LINE_HEIGHT_PX)
                : 0;

            const a11y =
              hasRange && p.low != null && p.high != null
                ? `${formatWeekdayFullFromDayKey(p.dayKey)}. Energy ${formatKcalShort(p.low)} to ${formatKcalShort(p.high)} kcal.`
                : `${formatWeekdayFullFromDayKey(p.dayKey)}. No energy estimate.`;

            return (
              <View
                key={p.dayKey}
                style={[styles.barCol, { height: columnHeight }]}
                accessible
                accessibilityLabel={a11y}
                testID={`energy-week-bar-${p.dayKey}`}
              >
                {showLabels && p.high != null ? (
                  <Text
                    style={[styles.valueLabel, { bottom: highLabelBottom }]}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    testID={`energy-week-bar-${p.dayKey}-high-label`}
                  >
                    {formatKcalShort(p.high)}
                  </Text>
                ) : null}
                {layout != null ? (
                  <Animated.View
                    style={[
                      styles.rangeBar,
                      {
                        height: anim,
                        bottom: barBottomInCol,
                        opacity: barOpacity,
                        backgroundColor: ENERGY_RANGE_BAR_FILL,
                      },
                    ]}
                  />
                ) : null}
                {showLowLabel && p.low != null ? (
                  <Text
                    style={[styles.valueLabel, { bottom: lowLabelBottom }]}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    testID={`energy-week-bar-${p.dayKey}-low-label`}
                  >
                    {formatKcalShort(p.low)}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: "100%",
  },
  trackWrap: {
    position: "relative",
    width: "100%",
  },
  barsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: "100%",
    paddingHorizontal: 8,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
    maxWidth: 48,
    position: "relative",
  },
  rangeBar: {
    position: "absolute",
    width: "72%",
    maxWidth: 28,
    minWidth: 8,
    borderRadius: BAR_RADIUS,
  },
  valueLabel: {
    position: "absolute",
    alignSelf: "center",
    fontSize: 10,
    lineHeight: LABEL_LINE_HEIGHT_PX,
    fontWeight: "600",
    color: UI_TEXT_TERTIARY_LABEL,
    textAlign: "center",
  },
});
