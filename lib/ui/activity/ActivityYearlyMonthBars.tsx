import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import type { ActivityYearlyChartMonth } from "@/lib/data/activity/activityYearlyCardModel";
import { ENERGY_BASELINE_FILL_COLOR } from "@/lib/ui/energy/EnergyBaselineProgressTrack";
import { UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";
import { STEP_TIER_TRACK_RIM_BORDER } from "@/lib/utils/activityStepTierVisual";

/**
 * 12-month bar track for the Yearly Activity card.
 *
 * Visual parity with {@link ActivityWeeklyStepsBars}:
 * - Same `ENERGY_BASELINE_FILL_COLOR` (Daily Energy blue) for every bar.
 * - Same rim hairline below the track.
 * - Same "current vs non-current" opacity dimming applied at month granularity.
 * - Same Jest-aware animation (mounts at final height during tests).
 *
 * Differences:
 * - 12 columns (Jan→Dec) instead of 7 weekdays.
 * - "Today" emphasis is keyed off the current calendar month (`todayMonthKey`).
 * - Future months are rendered as low-opacity placeholders even though their value is `null`.
 */

const BAR_TOP_RADIUS = 6;
/** Multiplier on non-current-month bars (current month stays at full emphasis). */
const BAR_DIM_OPACITY_NON_CURRENT = 0.74;
const ANIM_MS = 260;

type Props = {
  months: readonly ActivityYearlyChartMonth[];
  barTrackHeight: number;
  /** Vertical scale max (steps), shared with the year's hero figure. */
  maxScale: number;
  /** `"YYYY-MM"` for the anchor day (yesterday) — used to emphasize the current month. */
  todayMonthKey: string;
  /** Optional formatter for the small value label above bars (defaults to `"7.5k"` / `"940"`). */
  formatValueLabel?: (value: number) => string;
};

function defaultLabel(value: number): string {
  const r = Math.round(value);
  if (r >= 10_000) return `${Math.round(r / 1000)}k`;
  return r.toLocaleString();
}

function barTierOpacity(
  monthKey: string,
  todayMonthKey: string,
  value: number,
  maxScale: number,
  isFutureMonth: boolean,
): number {
  if (isFutureMonth || monthKey > todayMonthKey) {
    return value <= 0 ? 0.22 : 0.38;
  }
  if (value <= 0) return 0.3;
  const threshold = Math.max(maxScale * 0.06, 0.5);
  return value < threshold ? 0.46 : 1;
}

export function ActivityYearlyMonthBars({
  months,
  barTrackHeight,
  maxScale,
  todayMonthKey,
  formatValueLabel,
}: Props) {
  const labelFor = formatValueLabel ?? defaultLabel;
  const safeScale = Math.max(maxScale, 1);

  const targetHeights = useMemo(
    () =>
      months.map((m) => {
        const value = m.averageSteps ?? 0;
        return Math.max(6, Math.round((Math.max(0, value) / safeScale) * barTrackHeight));
      }),
    [months, safeScale, barTrackHeight],
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
    <View style={styles.outer} testID="activity-yearly-month-chart">
      <View style={styles.valueLabelsRow}>
        {months.map((m) => {
          const showLabel = !m.isFutureMonth && m.averageSteps != null && m.averageSteps > 0;
          return (
            <View key={`lab-${m.monthKey}`} style={styles.valueLabelCell}>
              {showLabel ? (
                <Text style={styles.valueLabelAbove}>{labelFor(m.averageSteps as number)}</Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={[styles.trackWrap, { height: barTrackHeight }]}>
        <View style={styles.barsRowInner}>
          {months.map((m, idx) => {
            const value = m.averageSteps ?? 0;
            const a11y = m.isFutureMonth
              ? `Month ${m.monthKey}, future month`
              : value > 0
                ? `Month ${m.monthKey}, ${value.toLocaleString()} average steps per day`
                : `Month ${m.monthKey}, no recorded steps`;
            const baseColor = ENERGY_BASELINE_FILL_COLOR;
            const stackOpacity =
              (m.isCurrentMonth ? 1 : BAR_DIM_OPACITY_NON_CURRENT) *
              barTierOpacity(m.monthKey, todayMonthKey, value, safeScale, m.isFutureMonth);

            return (
              <View key={m.monthKey} style={styles.barCol} accessible accessibilityLabel={a11y}>
                <Animated.View
                  style={[
                    styles.barFill,
                    {
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
    width: "100%",
    minHeight: 18,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  valueLabelCell: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
    maxWidth: 28,
  },
  valueLabelAbove: {
    fontSize: 10,
    fontWeight: "600",
    color: UI_TEXT_TERTIARY_LABEL,
    textAlign: "center",
  },
  trackWrap: {
    position: "relative",
    width: "100%",
    justifyContent: "flex-end",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: STEP_TIER_TRACK_RIM_BORDER,
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
    maxWidth: 28,
  },
  barFill: {
    width: "72%",
    maxWidth: 18,
    minWidth: 6,
    minHeight: 6,
    borderTopLeftRadius: BAR_TOP_RADIUS,
    borderTopRightRadius: BAR_TOP_RADIUS,
  },
});
