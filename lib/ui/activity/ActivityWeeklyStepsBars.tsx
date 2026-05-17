import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import type { ActivityThisWeekChartPoint } from "@/lib/data/activity/activityThisWeekCardModel";
import { UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";
import type { DayKey } from "@/lib/ui/calendar/types";
import { formatWeekdayFullFromDayKey } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import { STEP_TIER_COLORS, STEP_TIER_TRACK_RIM_BORDER } from "@/lib/utils/activityStepTierVisual";

const BAR_TOP_RADIUS = 6;

/** Multiplier on non-today bars (today stays full emphasis — matches yearly activity chart). */
const BAR_DIM_OPACITY_NON_TODAY = 0.74;

type ActivityWeeklyStepsBarsProps = {
  points: readonly ActivityThisWeekChartPoint[];
  barTrackHeight: number;
  maxScale: number;
  baselineMeanStepsPerDay: number;
  todayDayKey: DayKey;
  formatValueLabel?: (value: number) => string;
};

function shouldShowWeekValueLabel(dayKey: DayKey, todayDayKey: DayKey, steps: number, isFutureDay: boolean): boolean {
  if (isFutureDay) return false;
  return steps > 0;
}

function barStackOpacity(isFutureDay: boolean, value: number, maxScale: number): number {
  if (isFutureDay) {
    return value <= 0 ? 0.22 : 0.38;
  }
  if (value <= 0) return 0.3;
  const threshold = Math.max(maxScale * 0.06, 0.5);
  return value < threshold ? 0.46 : 1;
}

const ANIM_MS = 260;

export function ActivityWeeklyStepsBars({
  points,
  barTrackHeight,
  maxScale,
  baselineMeanStepsPerDay,
  todayDayKey,
  formatValueLabel,
}: ActivityWeeklyStepsBarsProps) {
  const labelFor = formatValueLabel ?? ((v: number) => String(Math.round(v)));
  const safeScale = Math.max(maxScale, 1);
  const baselineYPxFromBottom = Math.min(
    barTrackHeight,
    Math.max(0, (baselineMeanStepsPerDay / safeScale) * barTrackHeight),
  );

  const targetHeights = useMemo(
    () =>
      points.map((p) => Math.max(6, Math.round((Math.max(0, p.value) / safeScale) * barTrackHeight))),
    [points, safeScale, barTrackHeight],
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

  return (
    <View style={styles.outer} testID="activity-this-week-weekly-chart">
      <View style={styles.valueLabelsRow}>
        {points.map((p) => {
          const showLabel = shouldShowWeekValueLabel(p.dayKey, todayDayKey, p.value, p.isFutureDay);
          return (
            <View key={`lab-${p.dayKey}`} style={styles.valueLabelCell}>
              {showLabel ? <Text style={styles.valueLabelAbove}>{labelFor(p.value)}</Text> : null}
            </View>
          );
        })}
      </View>

      <View style={[styles.trackWrap, { height: barTrackHeight }]}>
        <View
          pointerEvents="none"
          style={[styles.baselineHairline, { bottom: baselineYPxFromBottom }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID="activity-this-week-chart-baseline-line"
        />
        <View
          pointerEvents="none"
          style={[styles.baselineLabelWrap, { bottom: baselineYPxFromBottom + StyleSheet.hairlineWidth + 2 }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={styles.baselineLabel}>Baseline</Text>
        </View>

        <View style={styles.barsRowInner}>
          {points.map((p, idx) => {
            const isToday = p.dayKey === todayDayKey && !p.isFutureDay;
            const baseColor = isToday ? STEP_TIER_COLORS.great : STEP_TIER_COLORS.good;
            const stackOpacity =
              (isToday ? 1 : BAR_DIM_OPACITY_NON_TODAY) * barStackOpacity(p.isFutureDay, p.value, safeScale);

            const weekday = formatWeekdayFullFromDayKey(p.dayKey);
            const stepsA11y = p.isFutureDay
              ? `${weekday}, future day`
              : p.value > 0
                ? `${weekday}, ${p.value.toLocaleString()} steps`
                : `${weekday}, zero steps`;

            return (
              <View key={p.dayKey} style={styles.barCol} accessible accessibilityLabel={stepsA11y}>
                <Animated.View
                  style={[
                    styles.barFill,
                    {
                      borderTopLeftRadius: BAR_TOP_RADIUS,
                      borderTopRightRadius: BAR_TOP_RADIUS,
                      height: animsRef.current[idx] ?? new Animated.Value(0),
                      opacity: stackOpacity,
                      backgroundColor: baseColor,
                    },
                  ]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
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
  valueLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginBottom: 3,
    minHeight: 14,
  },
  valueLabelCell: {
    flex: 1,
    alignItems: "center",
  },
  valueLabelAbove: {
    fontSize: 10,
    fontWeight: "400",
    color: UI_TEXT_TERTIARY_LABEL,
    textAlign: "center",
    letterSpacing: -0.08,
  },
  trackWrap: {
    position: "relative",
    width: "100%",
    justifyContent: "flex-end",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: STEP_TIER_TRACK_RIM_BORDER,
  },
  baselineHairline: {
    position: "absolute",
    left: 8,
    right: 8,
    height: StyleSheet.hairlineWidth,
    borderRadius: StyleSheet.hairlineWidth / 2,
    backgroundColor: "rgba(60, 60, 67, 0.28)",
    zIndex: 1,
  },
  baselineLabelWrap: {
    position: "absolute",
    left: 10,
    zIndex: 2,
  },
  baselineLabel: {
    fontSize: 9,
    fontWeight: "400",
    color: UI_TEXT_TERTIARY_LABEL,
    letterSpacing: 0.05,
    opacity: 0.92,
  },
  barsRowInner: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: "100%",
    paddingHorizontal: 8,
    width: "100%",
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    minWidth: 0,
    maxWidth: 48,
  },
  barFill: {
    width: "100%",
    minHeight: 6,
  },
});
