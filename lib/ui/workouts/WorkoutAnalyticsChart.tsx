import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  WorkoutAnalyticsMetrics,
  WorkoutAnalyticsMonthPoint,
  WorkoutOverviewMetricsTab,
} from "@/lib/data/workouts/workoutsCalendarModel";
import type {
  StrengthMonthChartBar,
  StrengthMonthScopedMetrics,
} from "@/lib/data/workouts/strengthOverviewMonthAnalytics";
import {
  formatTypicalStrengthVolumeLabel,
  formatWorkoutDurationLabel,
} from "@/lib/data/workouts/workoutDisplay";
import { overviewAccentForTab } from "@/lib/ui/workouts/workoutOverviewAnalyticsTheme";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import {
  WorkoutAnalyticsMonthBarChart,
  workoutMonthBarChartYAxisTicks,
} from "@/lib/ui/workouts/WorkoutAnalyticsMonthBarChart";

type MetricsByTab = Record<WorkoutOverviewMetricsTab, WorkoutAnalyticsMetrics>;

export type WorkoutAnalyticsChartProps = {
  headerTitle: string;
  onViewMore: () => void;
} & (
  | {
      layout: "dual";
      chartPointsByTab: Record<WorkoutOverviewMetricsTab, WorkoutAnalyticsMonthPoint[]>;
      metricsByTab: MetricsByTab;
    }
  | {
      layout: "single";
      domain: WorkoutOverviewMetricsTab;
      chartPoints: WorkoutAnalyticsMonthPoint[];
      metrics: WorkoutAnalyticsMetrics;
    }
  | {
      layout: "singleStrengthPeriod";
      yearTabLabel: string;
      monthTabLabel: string;
      yearChartPoints: WorkoutAnalyticsMonthPoint[];
      yearMetrics: WorkoutAnalyticsMetrics;
      monthChartBars: StrengthMonthChartBar[];
      monthMetrics: StrengthMonthScopedMetrics;
    }
);

/** Single-letter month labels for chart X-axis (Jan–Dec); not derived from localized monthLabel. */
const CHART_MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;

const BAR_TRACK_HEIGHT = 120;
/** Symmetric horizontal inset so Jan/Dec balance inside the plot. */
const CHART_PLOT_INSET_H = 8;
/** Matches monthLabelsRow marginTop + single-line label height for column alignment. */
const MONTH_LABEL_STACK_HEIGHT = 20;

type StrengthPeriodTab = "year" | "month";

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

type YearChartPoint = { monthKey: string; displayLabel: string; value: number };
type MonthChartPoint = { key: string; displayLabel: string; value: number };

/**
 * Training overview: dual-tab (legacy) or single-domain (Strength-only / Cardio-only product flows).
 */
export function WorkoutAnalyticsChart(props: WorkoutAnalyticsChartProps) {
  const { headerTitle, onViewMore } = props;
  const [dualTab, setDualTab] = useState<WorkoutOverviewMetricsTab>("strength");
  const [strengthPeriodTab, setStrengthPeriodTab] = useState<StrengthPeriodTab>("year");

  const resolved = useMemo(() => {
    if (props.layout === "dual") {
      return {
        kind: "dual" as const,
        accent: overviewAccentForTab(dualTab),
        yearPoints: props.chartPointsByTab[dualTab].map((p) => ({
          monthKey: p.monthKey,
          displayLabel: monthLetterFromMonthKey(p.monthKey),
          value: p.workouts,
        })),
        metrics: props.metricsByTab[dualTab],
        monthChartPoints: null as MonthChartPoint[] | null,
        monthMetrics: null as StrengthMonthScopedMetrics | null,
        tabBar: "dual" as const,
        dualTab,
        setDualTab,
        strengthPeriodTab: null as StrengthPeriodTab | null,
        setStrengthPeriodTab: null as null | ((t: StrengthPeriodTab) => void),
        yearTabLabel: "",
        monthTabLabel: "",
        chartEmptyMessage: "No data for this year yet" as const,
      };
    }
    if (props.layout === "singleStrengthPeriod") {
      const accent = overviewAccentForTab("strength");
      const yearPoints = props.yearChartPoints.map((p) => ({
        monthKey: p.monthKey,
        displayLabel: monthLetterFromMonthKey(p.monthKey),
        value: p.workouts,
      }));
      const monthChartPoints: MonthChartPoint[] = props.monthChartBars.map((b) => ({
        key: b.weekKey,
        displayLabel: b.label,
        value: b.value,
      }));
      const activePeriod = strengthPeriodTab;
      return {
        kind: "singleStrengthPeriod" as const,
        accent,
        yearPoints,
        metrics: activePeriod === "year" ? props.yearMetrics : null,
        monthChartPoints: activePeriod === "month" ? monthChartPoints : null,
        monthMetrics: activePeriod === "month" ? props.monthMetrics : null,
        tabBar: "strengthPeriod" as const,
        yearTabLabel: props.yearTabLabel,
        monthTabLabel: props.monthTabLabel,
        dualTab: null as WorkoutOverviewMetricsTab | null,
        setDualTab: null as null,
        strengthPeriodTab: activePeriod,
        setStrengthPeriodTab,
        chartEmptyMessage:
          activePeriod === "year"
            ? ("No data for this year yet" as const)
            : ("No data for this month yet" as const),
      };
    }
    return {
      kind: "single" as const,
      accent: overviewAccentForTab(props.domain),
      yearPoints: props.chartPoints.map((p) => ({
        monthKey: p.monthKey,
        displayLabel: monthLetterFromMonthKey(p.monthKey),
        value: p.workouts,
      })),
      metrics: props.metrics,
      monthChartPoints: null as MonthChartPoint[] | null,
      monthMetrics: null as StrengthMonthScopedMetrics | null,
      tabBar: "none" as const,
      dualTab: null as WorkoutOverviewMetricsTab | null,
      setDualTab: null as null,
      strengthPeriodTab: null as StrengthPeriodTab | null,
      setStrengthPeriodTab: null as null,
      yearTabLabel: "",
      monthTabLabel: "",
      chartEmptyMessage: "No data for this year yet" as const,
    };
  }, [props, dualTab, strengthPeriodTab]);

  const chartPoints: YearChartPoint[] | MonthChartPoint[] =
    resolved.monthChartPoints != null ? resolved.monthChartPoints : resolved.yearPoints;

  const useMonthFixedScaleBars =
    resolved.kind === "singleStrengthPeriod" &&
    resolved.strengthPeriodTab === "month" &&
    resolved.monthChartPoints != null &&
    chartPoints.length > 0;

  const max = Math.max(1, ...chartPoints.map((p) => p.value));
  const axisMid = Math.round(max / 2);

  const pointKey = (p: YearChartPoint | MonthChartPoint): string =>
    "monthKey" in p ? p.monthKey : p.key;

  const monthBarPoints = useMonthFixedScaleBars
    ? (chartPoints as MonthChartPoint[]).map((p) => ({
        key: p.key,
        label: p.displayLabel,
        value: p.value,
      }))
    : [];

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
      {resolved.tabBar === "dual" && resolved.setDualTab ? (
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => resolved.setDualTab("strength")}
            style={({ pressed }) => [
              styles.tab,
              resolved.dualTab === "strength" && styles.tabActive,
              pressed && styles.tabPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: resolved.dualTab === "strength" }}
            accessibilityLabel="Strength chart tab"
          >
            <Text
              style={[
                styles.tabText,
                resolved.dualTab === "strength" && [
                  styles.tabTextActive,
                  { color: resolved.accent.tabTextActive },
                ],
              ]}
            >
              Strength
            </Text>
          </Pressable>
          <Pressable
            onPress={() => resolved.setDualTab("cardio")}
            style={({ pressed }) => [
              styles.tab,
              resolved.dualTab === "cardio" && styles.tabActive,
              pressed && styles.tabPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: resolved.dualTab === "cardio" }}
            accessibilityLabel="Cardio chart tab"
          >
            <Text
              style={[
                styles.tabText,
                resolved.dualTab === "cardio" && [
                  styles.tabTextActive,
                  { color: resolved.accent.tabTextActive },
                ],
              ]}
            >
              Cardio
            </Text>
          </Pressable>
        </View>
      ) : resolved.tabBar === "strengthPeriod" && resolved.setStrengthPeriodTab ? (
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => resolved.setStrengthPeriodTab("year")}
            style={({ pressed }) => [
              styles.tab,
              resolved.strengthPeriodTab === "year" && styles.tabActive,
              pressed && styles.tabPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: resolved.strengthPeriodTab === "year" }}
            accessibilityLabel={`Year ${resolved.yearTabLabel} chart tab`}
          >
            <Text
              style={[
                styles.tabText,
                resolved.strengthPeriodTab === "year" && [
                  styles.tabTextActive,
                  { color: resolved.accent.tabTextActive },
                ],
              ]}
            >
              {resolved.yearTabLabel}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => resolved.setStrengthPeriodTab("month")}
            style={({ pressed }) => [
              styles.tab,
              resolved.strengthPeriodTab === "month" && styles.tabActive,
              pressed && styles.tabPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: resolved.strengthPeriodTab === "month" }}
            accessibilityLabel={`Month ${resolved.monthTabLabel} chart tab`}
          >
            <Text
              style={[
                styles.tabText,
                resolved.strengthPeriodTab === "month" && [
                  styles.tabTextActive,
                  { color: resolved.accent.tabTextActive },
                ],
              ]}
            >
              {resolved.monthTabLabel}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.singleDomainChartSpacer} />
      )}
      {chartPoints.length === 0 ? (
        <Text style={styles.placeholder}>{resolved.chartEmptyMessage}</Text>
      ) : useMonthFixedScaleBars ? (
        <View style={styles.chartPlotRow}>
          <View style={styles.yAxisColumn}>
            <View style={styles.yAxisTrackMonth}>
              {workoutMonthBarChartYAxisTicks().map((t) => (
                <Text key={t} style={styles.yAxisTick}>
                  {t}
                </Text>
              ))}
            </View>
            <View style={styles.yAxisBelowTrackSpacer} />
          </View>
          <View style={styles.chartBarsBlock}>
            <View style={[styles.chartBarsInner, styles.chartBarsInnerMonth]}>
              <WorkoutAnalyticsMonthBarChart points={monthBarPoints} barColor={resolved.accent.barColor} />
            </View>
          </View>
        </View>
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
                  <View key={pointKey(p)} style={styles.barCol}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(6, Math.round((p.value / max) * BAR_TRACK_HEIGHT)),
                          backgroundColor: resolved.accent.barColor,
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.monthLabelsRow}>
                {chartPoints.map((p) => (
                  <View key={pointKey(p)} style={styles.monthLabelCol}>
                    <Text
                      style={styles.barLabel}
                      accessibilityLabel={
                        "monthKey" in p ? `Month ${p.monthKey}` : `Week ${p.displayLabel}`
                      }
                    >
                      {p.displayLabel}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}

      {resolved.kind === "singleStrengthPeriod" && resolved.strengthPeriodTab === "month" && resolved.monthMetrics ? (
        <View style={styles.metricsGrid}>
          <View style={styles.metricsRow}>
            <View style={[styles.metricCell, { backgroundColor: resolved.accent.metricTileBg }]}>
              <Text style={styles.metricLabel}>Total Workouts</Text>
              <Text style={styles.metricValue}>{resolved.monthMetrics.totalWorkouts.toLocaleString()}</Text>
            </View>
            <View style={[styles.metricCell, { backgroundColor: resolved.accent.metricTileBg }]}>
              <Text style={styles.metricLabel}>Avg per Week</Text>
              <Text style={styles.metricValue}>{formatAvg(resolved.monthMetrics.avgPerWeek)}</Text>
            </View>
          </View>
          <View style={styles.metricsRow}>
            <View style={[styles.metricCell, { backgroundColor: resolved.accent.metricTileBg }]}>
              <Text style={styles.metricLabel}>Avg Duration</Text>
              <Text style={styles.metricValue}>
                {formatWorkoutDurationLabel(resolved.monthMetrics.avgDurationMinutes)}
              </Text>
            </View>
            <View style={[styles.metricCell, { backgroundColor: resolved.accent.metricTileBg }]}>
              <Text style={styles.metricLabel}>Typical Volume</Text>
              <Text style={styles.metricValue}>
                {formatTypicalStrengthVolumeLabel(resolved.monthMetrics.typicalVolumeKg)}
              </Text>
            </View>
          </View>
        </View>
      ) : resolved.metrics != null ? (
        <View style={styles.metricsGrid}>
          <View style={styles.metricsRow}>
            <View style={[styles.metricCell, { backgroundColor: resolved.accent.metricTileBg }]}>
              <Text style={styles.metricLabel}>Total Workouts</Text>
              <Text style={styles.metricValue}>{resolved.metrics.totalWorkouts.toLocaleString()}</Text>
            </View>
            <View style={[styles.metricCell, { backgroundColor: resolved.accent.metricTileBg }]}>
              <Text style={styles.metricLabel}>Avg per Month</Text>
              <Text style={styles.metricValue}>{formatAvg(resolved.metrics.avgPerMonth)}</Text>
            </View>
          </View>
          <View style={styles.metricsRow}>
            <View style={[styles.metricCell, { backgroundColor: resolved.accent.metricTileBg }]}>
              <Text style={styles.metricLabel}>Avg per Week</Text>
              <Text style={styles.metricValue}>{formatAvg(resolved.metrics.avgPerWeek)}</Text>
            </View>
            <View style={[styles.metricCell, { backgroundColor: resolved.accent.metricTileBg }]}>
              <Text style={styles.metricLabel}>Avg Duration</Text>
              <Text style={styles.metricValue}>
                {formatWorkoutDurationLabel(resolved.metrics.avgDurationMinutes)}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
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
  singleDomainChartSpacer: { height: 12 },
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
  yAxisTrackMonth: {
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
  /** Slightly tighter side inset so month bars + internal plot pad stay balanced. */
  chartBarsInnerMonth: {
    paddingLeft: 4,
    paddingRight: 4,
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
