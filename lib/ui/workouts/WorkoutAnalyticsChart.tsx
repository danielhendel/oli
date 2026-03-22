import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  WorkoutAnalyticsMetrics,
  WorkoutAnalyticsMonthPoint,
  WorkoutOverviewMetricsTab,
} from "@/lib/data/workouts/workoutsCalendarModel";
import { formatWorkoutDurationLabel } from "@/lib/data/workouts/workoutDisplay";
import { overviewAccentForTab } from "@/lib/ui/workouts/workoutOverviewAnalyticsTheme";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";

type MetricsByTab = Record<WorkoutOverviewMetricsTab, WorkoutAnalyticsMetrics>;

/** Single-letter month labels for chart X-axis (Jan–Dec); not derived from localized monthLabel. */
const CHART_MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;

const BAR_TRACK_HEIGHT = 120;
/** Symmetric horizontal inset so Jan/Dec balance inside the plot. */
const CHART_PLOT_INSET_H = 8;
/** Matches monthLabelsRow marginTop + single-line label height for column alignment. */
const MONTH_LABEL_STACK_HEIGHT = 20;

function monthLetterFromMonthKey(monthKey: string): string {
  const part = monthKey.slice(5, 7);
  const m = Number(part);
  if (!Number.isFinite(m) || m < 1 || m > 12) return "—";
  return CHART_MONTH_LETTERS[m - 1] ?? "—";
}

function formatAvg(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(1);
}

type ChartPoint = { monthKey: string; displayLabel: string; value: number };

/**
 * Workouts Overview: one card — year header, Strength/Cardio tabs, Jan–Dec chart, and metrics share tab state.
 */
export function WorkoutAnalyticsChart({
  headerTitle,
  onViewMore,
  chartPointsByTab,
  metricsByTab,
}: {
  headerTitle: string;
  onViewMore: () => void;
  chartPointsByTab: Record<WorkoutOverviewMetricsTab, WorkoutAnalyticsMonthPoint[]>;
  metricsByTab: MetricsByTab;
}) {
  const [tab, setTab] = useState<WorkoutOverviewMetricsTab>("strength");
  const accent = overviewAccentForTab(tab);
  const points = chartPointsByTab[tab];
  const metrics = useMemo(() => metricsByTab[tab], [metricsByTab, tab]);
  const chartPoints = useMemo<ChartPoint[]>(
    () =>
      points.map((p) => ({
        monthKey: p.monthKey,
        displayLabel: monthLetterFromMonthKey(p.monthKey),
        value: p.workouts,
      })),
    [points],
  );
  const max = Math.max(1, ...chartPoints.map((p) => p.value));
  const axisMid = Math.round(max / 2);

  return (
    <View style={styles.card}>
      <View style={[workoutOverviewInCardHeaderStyles.row, styles.inCardHeaderRowSpacing]}>
        <Text style={workoutOverviewInCardHeaderStyles.title}>{headerTitle}</Text>
        <Pressable
          onPress={onViewMore}
          accessibilityRole="button"
          accessibilityLabel="View more"
          hitSlop={8}
          style={({ pressed }) => [
            workoutOverviewInCardHeaderStyles.linkHit,
            pressed && workoutOverviewInCardHeaderStyles.linkPressed,
          ]}
        >
          <Text style={workoutOverviewInCardHeaderStyles.link}>View More</Text>
        </Pressable>
      </View>
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setTab("strength")}
          style={({ pressed }) => [
            styles.tab,
            tab === "strength" && styles.tabActive,
            pressed && styles.tabPressed,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "strength" }}
          accessibilityLabel="Strength chart tab"
        >
          <Text
            style={[
              styles.tabText,
              tab === "strength" && [styles.tabTextActive, { color: accent.tabTextActive }],
            ]}
          >
            Strength
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("cardio")}
          style={({ pressed }) => [
            styles.tab,
            tab === "cardio" && styles.tabActive,
            pressed && styles.tabPressed,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "cardio" }}
          accessibilityLabel="Cardio chart tab"
        >
          <Text
            style={[
              styles.tabText,
              tab === "cardio" && [styles.tabTextActive, { color: accent.tabTextActive }],
            ]}
          >
            Cardio
          </Text>
        </Pressable>
      </View>
      {chartPoints.length === 0 ? (
        <Text style={styles.placeholder}>No data for this year yet</Text>
      ) : (
        <View style={styles.chartPlotRow}>
          <View style={styles.yAxisColumn}>
            <View style={styles.yAxisTrack}>
              <Text style={styles.yAxisTick}>{max}</Text>
              <Text style={styles.yAxisTick}>{axisMid}</Text>
              <Text style={styles.yAxisTick}>0</Text>
            </View>
            <View style={styles.yAxisBelowTrackSpacer} />
          </View>
          <View style={styles.chartBarsBlock}>
            <View style={styles.chartBarsInner}>
              <View style={styles.barsRow}>
                {chartPoints.map((p) => (
                  <View key={p.monthKey} style={styles.barCol}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(6, Math.round((p.value / max) * BAR_TRACK_HEIGHT)),
                          backgroundColor: accent.barColor,
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.monthLabelsRow}>
                {chartPoints.map((p) => (
                  <View key={p.monthKey} style={styles.monthLabelCol}>
                    <Text style={styles.barLabel} accessibilityLabel={`Month ${p.monthKey}`}>
                      {p.displayLabel}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}

      <View style={styles.metricsGrid}>
        <View style={styles.metricsRow}>
          <View style={[styles.metricCell, { backgroundColor: accent.metricTileBg }]}>
            <Text style={styles.metricLabel}>Total Workouts</Text>
            <Text style={styles.metricValue}>{metrics.totalWorkouts.toLocaleString()}</Text>
          </View>
          <View style={[styles.metricCell, { backgroundColor: accent.metricTileBg }]}>
            <Text style={styles.metricLabel}>Avg per Month</Text>
            <Text style={styles.metricValue}>{formatAvg(metrics.avgPerMonth)}</Text>
          </View>
        </View>
        <View style={styles.metricsRow}>
          <View style={[styles.metricCell, { backgroundColor: accent.metricTileBg }]}>
            <Text style={styles.metricLabel}>Avg per Week</Text>
            <Text style={styles.metricValue}>{formatAvg(metrics.avgPerWeek)}</Text>
          </View>
          <View style={[styles.metricCell, { backgroundColor: accent.metricTileBg }]}>
            <Text style={styles.metricLabel}>Avg Duration</Text>
            <Text style={styles.metricValue}>
              {formatWorkoutDurationLabel(metrics.avgDurationMinutes)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
  },
  inCardHeaderRowSpacing: { marginBottom: 12 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#EBEBEF",
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.1)",
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabPressed: { opacity: 0.78 },
  tabText: { fontSize: 15, fontWeight: "500", color: "#8E8E93" },
  tabTextActive: { fontWeight: "700" },
  placeholder: { fontSize: 15, fontWeight: "400", color: "#8E8E93", paddingVertical: 16 },
  chartPlotRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    minHeight: 150,
  },
  yAxisColumn: {
    width: 24,
    flexShrink: 0,
    alignItems: "flex-end",
  },
  yAxisBelowTrackSpacer: {
    height: MONTH_LABEL_STACK_HEIGHT,
  },
  yAxisTrack: {
    height: BAR_TRACK_HEIGHT,
    width: "100%",
    justifyContent: "space-between",
  },
  yAxisTick: {
    fontSize: 11,
    fontWeight: "400",
    color: "#AEAEB2",
    textAlign: "right",
    lineHeight: 13,
  },
  chartBarsBlock: {
    flex: 1,
    minWidth: 0,
  },
  chartBarsInner: {
    width: "100%",
    paddingLeft: CHART_PLOT_INSET_H,
    paddingRight: CHART_PLOT_INSET_H,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: BAR_TRACK_HEIGHT,
    width: "100%",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D1D1D6",
  },
  monthLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
  },
  barCol: {
    width: 20,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  monthLabelCol: {
    width: 20,
    alignItems: "center",
  },
  bar: { width: 20, borderRadius: 5 },
  barLabel: {
    fontSize: 11,
    fontWeight: "400",
    color: "#AEAEB2",
    textAlign: "center",
  },
  metricsGrid: { marginTop: 16, gap: 12 },
  metricsRow: { flexDirection: "row", gap: 12 },
  metricCell: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.78)",
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "rgba(255,255,255,0.95)",
    letterSpacing: -0.25,
  },
});
