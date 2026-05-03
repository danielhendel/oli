import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { UI_BORDER_SUBTLE, UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";

/** Fixed vertical scale for strength overview month tab (workouts per week row). */
export const WORKOUT_ANALYTICS_MONTH_CHART_Y_MAX = 7;

const PLOT_HEIGHT = 120;
/** Horizontal breathing room inside the plot (card padding is separate). */
const PLOT_PAD_H = 10;
/** Space between bar columns — keeps 4–6 buckets from feeling cramped. */
const BAR_COLUMN_GAP = 10;
/** Consistent bar thickness (premium: not too thin, not heavy). */
const BAR_WIDTH = 22;
const BAR_RADIUS = 6;
/** Minimum visible height for any non-zero count so low values stay legible. */
const BAR_MIN_HEIGHT = 6;

export type WorkoutAnalyticsMonthBarPoint = {
  key: string;
  label: string;
  value: number;
};

type Props = {
  points: WorkoutAnalyticsMonthBarPoint[];
  barColor: string;
};

/** Y-axis labels for the fixed 0–7 domain (sparse, Apple-style). */
export function workoutMonthBarChartYAxisTicks(): readonly number[] {
  return [7, 5, 3, 1, 0];
}

function barHeightPx(value: number): number {
  const clamped = Math.min(Math.max(value, 0), WORKOUT_ANALYTICS_MONTH_CHART_Y_MAX);
  if (clamped <= 0) return 0;
  const scaled = Math.round((clamped / WORKOUT_ANALYTICS_MONTH_CHART_Y_MAX) * PLOT_HEIGHT);
  return Math.max(BAR_MIN_HEIGHT, scaled);
}

/**
 * Week-row bar chart for the strength overview month tab only (fixed 0–7 scale, no auto max).
 */
export function WorkoutAnalyticsMonthBarChart({ points, barColor }: Props) {
  return (
    <View style={styles.root}>
      <View style={[styles.barsRow, { paddingHorizontal: PLOT_PAD_H, gap: BAR_COLUMN_GAP }]}>
        {points.map((p) => (
          <View key={p.key} style={styles.barColumn}>
            <View
              style={[
                styles.bar,
                {
                  width: BAR_WIDTH,
                  height: barHeightPx(p.value),
                  backgroundColor: barColor,
                },
              ]}
              accessibilityLabel={`Week row ${p.label}, ${p.value} workouts`}
            />
          </View>
        ))}
      </View>
      <View style={[styles.labelsRow, { paddingHorizontal: PLOT_PAD_H, gap: BAR_COLUMN_GAP }]}>
        {points.map((p) => (
          <View key={p.key} style={styles.labelCell}>
            <Text style={styles.labelText} accessibilityLabel={`Week row ${p.label}`}>
              {p.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: "100%" },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    height: PLOT_HEIGHT,
    width: "100%",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI_BORDER_SUBTLE,
  },
  barColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    borderRadius: BAR_RADIUS,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    marginTop: 8,
  },
  labelCell: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },
  labelText: {
    fontSize: 11,
    fontWeight: "400",
    color: UI_TEXT_TERTIARY_LABEL,
    textAlign: "center",
  },
});
