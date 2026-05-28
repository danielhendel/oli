import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import type { CardioYearlyChartMonth } from "@/lib/data/workouts/cardioYearlyCardModel";
import { ENERGY_BASELINE_FILL_COLOR } from "@/lib/ui/energy/EnergyBaselineProgressTrack";
import { UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";
import { STEP_TIER_TRACK_RIM_BORDER } from "@/lib/utils/activityStepTierVisual";

/**
 * Sibling of {@link StrengthYearlyMonthBars} — same Oli blue track, animation, rim hairline,
 * and non-current-month dimming. Differences vs strength:
 * - Bound to {@link CardioYearlyChartMonth} (miles per month, not workout counts).
 * - Value labels above bars show "X.X" (1dp) and are hidden when the month has zero miles.
 */
const IS_JEST = typeof process.env.JEST_WORKER_ID !== "undefined";

const BAR_TOP_RADIUS = 6;
const BAR_DIM_OPACITY_NON_CURRENT = 0.74;
const ANIM_MS = 260;

type Props = {
  months: readonly CardioYearlyChartMonth[];
  barTrackHeight: number;
  maxScale: number;
  todayMonthKey: string;
  formatValueLabel?: (value: number) => string;
};

function defaultLabel(value: number): string {
  return value.toFixed(1);
}

function barTierOpacity(
  monthKey: string,
  todayMonthKey: string,
  value: number,
  isFutureMonth: boolean,
): number {
  if (isFutureMonth || monthKey > todayMonthKey) {
    return value <= 0 ? 0.22 : 0.38;
  }
  if (value <= 0) return 0.3;
  return 1;
}

export function CardioYearlyMonthBars({
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
      months.map((m) =>
        Math.max(6, Math.round((Math.max(0, m.miles) / safeScale) * barTrackHeight)),
      ),
    [months, safeScale, barTrackHeight],
  );

  const animsRef = useRef<Animated.Value[]>([]);
  if (!IS_JEST && animsRef.current.length !== targetHeights.length) {
    animsRef.current = targetHeights.map(() => new Animated.Value(0));
  }

  const heightSig = targetHeights.join(",");

  useEffect(() => {
    if (IS_JEST) return;
    targetHeights.forEach((target, i) => {
      const v = animsRef.current[i];
      if (!v) return;
      v.setValue(0);
      Animated.timing(v, {
        toValue: target,
        duration: ANIM_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    });
  }, [heightSig]);

  return (
    <View style={styles.outer} testID="cardio-yearly-month-chart">
      <View style={styles.valueLabelsRow}>
        {months.map((m) => {
          const showLabel = !m.isFutureMonth && m.miles > 0;
          return (
            <View key={`lab-${m.monthKey}`} style={styles.valueLabelCell}>
              {showLabel ? <Text style={styles.valueLabelAbove}>{labelFor(m.miles)}</Text> : null}
            </View>
          );
        })}
      </View>

      <View style={[styles.trackWrap, { height: barTrackHeight }]}>
        <View style={styles.barsRowInner}>
          {months.map((m, idx) => {
            const a11y = m.isFutureMonth
              ? `Month ${m.monthKey}, future month`
              : m.miles > 0
                ? `Month ${m.monthKey}, ${m.miles.toFixed(1)} miles completed`
                : `Month ${m.monthKey}, no recorded cardio miles`;
            const stackOpacity =
              (m.isCurrentMonth ? 1 : BAR_DIM_OPACITY_NON_CURRENT) *
              barTierOpacity(m.monthKey, todayMonthKey, m.miles, m.isFutureMonth);

            return (
              <View key={m.monthKey} style={styles.barCol} accessible accessibilityLabel={a11y}>
                {IS_JEST ? (
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: targetHeights[idx] ?? 0,
                        opacity: stackOpacity,
                        backgroundColor: ENERGY_BASELINE_FILL_COLOR,
                      },
                    ]}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                ) : (
                  <Animated.View
                    style={[
                      styles.barFill,
                      {
                        height: animsRef.current[idx] ?? new Animated.Value(0),
                        opacity: stackOpacity,
                        backgroundColor: ENERGY_BASELINE_FILL_COLOR,
                      },
                    ]}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { width: "100%" },
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
