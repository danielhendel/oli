import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import type { WeeklySleepChartPoint } from "@/lib/data/sleep/buildWeeklySleepVm";
import { formatWeekdayFullFromDayKey } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import { formatSleepDurationMinutes } from "@/lib/format/ouraScore";
import { UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";
import type { DayKey } from "@/lib/ui/calendar/types";

const BAR_TOP_RADIUS = 6;
const SLEEP_BAR_FILL = "#4F7CFF";
const BAR_DIM_OPACITY_NON_TODAY = 0.74;
const ANIM_MS = 260;

type SleepWeeklyDurationBarsProps = {
  points: readonly WeeklySleepChartPoint[];
  barTrackHeight: number;
  maxScale: number;
  todayDayKey: DayKey;
};

function shouldShowWeekValueLabel(
  dayKey: DayKey,
  todayDayKey: DayKey,
  minutes: number,
  isFutureDay: boolean,
): boolean {
  if (isFutureDay) return false;
  return minutes > 0;
}

function barStackOpacity(isFutureDay: boolean, value: number, maxScale: number): number {
  if (isFutureDay) {
    return value <= 0 ? 0.22 : 0.38;
  }
  if (value <= 0) return 0.3;
  const threshold = Math.max(maxScale * 0.06, 0.5);
  return value < threshold ? 0.46 : 1;
}

export function SleepWeeklyDurationBars({
  points,
  barTrackHeight,
  maxScale,
  todayDayKey,
}: SleepWeeklyDurationBarsProps) {
  const safeScale = Math.max(maxScale, 1);

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
    <View style={styles.outer} testID="sleep-this-week-weekly-chart">
      <View style={styles.valueLabelsRow}>
        {points.map((p) => {
          const showLabel = shouldShowWeekValueLabel(p.dayKey, todayDayKey, p.value, p.isFutureDay);
          return (
            <View key={`lab-${p.dayKey}`} style={styles.valueLabelCell}>
              {showLabel ? (
                <Text style={styles.valueLabelAbove}>{formatSleepDurationMinutes(p.value)}</Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={[styles.trackWrap, { height: barTrackHeight }]}>
        <View style={styles.barsRow}>
          {points.map((p, i) => {
            const isToday = p.dayKey === todayDayKey;
            const opacity = barStackOpacity(p.isFutureDay, p.value, safeScale);
            const barOpacity = isToday ? opacity : opacity * BAR_DIM_OPACITY_NON_TODAY;
            const anim = animsRef.current[i]!;
            const a11y =
              p.value > 0
                ? `${formatWeekdayFullFromDayKey(p.dayKey)}. Sleep ${formatSleepDurationMinutes(p.value)}.`
                : `${formatWeekdayFullFromDayKey(p.dayKey)}. No completed sleep.`;
            return (
              <View
                key={p.dayKey}
                style={styles.barCol}
                accessible
                accessibilityLabel={a11y}
                testID={`sleep-week-bar-${p.dayKey}`}
              >
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      height: anim,
                      opacity: barOpacity,
                      backgroundColor: SLEEP_BAR_FILL,
                    },
                  ]}
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
    width: "100%",
    minHeight: 18,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  valueLabelCell: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
    maxWidth: 48,
  },
  valueLabelAbove: {
    fontSize: 10,
    fontWeight: "600",
    color: UI_TEXT_TERTIARY_LABEL,
    textAlign: "center",
  },
  trackWrap: {
    width: "100%",
    justifyContent: "flex-end",
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: "100%",
    paddingHorizontal: 8,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 0,
    maxWidth: 48,
    height: "100%",
  },
  bar: {
    width: "72%",
    maxWidth: 28,
    minWidth: 8,
    borderTopLeftRadius: BAR_TOP_RADIUS,
    borderTopRightRadius: BAR_TOP_RADIUS,
  },
});
