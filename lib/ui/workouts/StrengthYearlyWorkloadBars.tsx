import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { shouldShowStrengthYearlyMonthValueLabel } from "@/lib/data/workouts/strengthYearlyChartLabelVisibility";
import { UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";
import { STEP_TIER_COLORS, STEP_TIER_TRACK_RIM_BORDER } from "@/lib/utils/activityStepTierVisual";

export type YearWorkloadPoint = { monthKey: string; displayLabel: string; value: number };

const BAR_TOP_RADIUS = 6;

type StrengthYearlyWorkloadBarsProps = {
  points: YearWorkloadPoint[];
  barTrackHeight: number;
  /** Primary bar fill ({@link STEP_TIER_COLORS.good}). */
  fillColorGood: string;
  /** Vertical scale maximum (aligned with Y-axis ticks). */
  maxScale: number;
  /** Expected monthly workload at baseline rate (same units as bar values). */
  baselineMonthlyAvg: number;
  /** Month key `YYYY-MM` for today in the analytics calendar year. */
  todayMonthKey: string;
  /** Optional label above bars (defaults to integer string). */
  formatValueLabel?: (value: number) => string;
};

/** Multiplier on non-current-month bars (current month stays at full emphasis). */
const BAR_DIM_OPACITY_NON_CURRENT = 0.74;

function barTierOpacity(
  monthKey: string,
  todayMonthKey: string,
  value: number,
  maxScale: number,
): number {
  if (monthKey > todayMonthKey) {
    return value <= 0 ? 0.22 : 0.38;
  }
  if (value <= 0) return 0.3;
  const threshold = Math.max(maxScale * 0.06, 0.5);
  return value < threshold ? 0.46 : 1;
}

const ANIM_MS = 260;

export function StrengthYearlyWorkloadBars({
  points,
  barTrackHeight,
  fillColorGood,
  maxScale,
  baselineMonthlyAvg,
  todayMonthKey,
  formatValueLabel,
}: StrengthYearlyWorkloadBarsProps) {
  const labelFor = formatValueLabel ?? ((v: number) => String(Math.round(v)));
  const baselineYPxFromBottom = Math.min(
    barTrackHeight,
    Math.max(0, (baselineMonthlyAvg / maxScale) * barTrackHeight),
  );

  const targetHeights = useMemo(
    () => points.map((p) => Math.max(6, Math.round((p.value / maxScale) * barTrackHeight))),
    [points, maxScale, barTrackHeight],
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

  function pointKey(p: YearWorkloadPoint): string {
    return p.monthKey;
  }

  return (
    <View style={styles.outer}>
      <View style={styles.valueLabelsRow}>
        {points.map((p) => {
          const showLabel = shouldShowStrengthYearlyMonthValueLabel(p.monthKey, todayMonthKey, p.value);
          return (
            <View key={`lab-${pointKey(p)}`} style={styles.valueLabelCell}>
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
          testID="strength-yearly-chart-baseline-line"
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
            const isTodayMonth = p.monthKey === todayMonthKey;
            const baseColor = isTodayMonth ? STEP_TIER_COLORS.great : fillColorGood;
            const stackOpacity =
              (isTodayMonth ? 1 : BAR_DIM_OPACITY_NON_CURRENT) *
              barTierOpacity(p.monthKey, todayMonthKey, p.value, maxScale);

            return (
              <View key={pointKey(p)} style={styles.barCol}>
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
    width: 20,
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
    width: 20,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  barFill: {
    width: "100%",
    minHeight: 6,
  },
});
