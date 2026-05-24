import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { ActivityThisWeekCardModel } from "@/lib/data/activity/activityThisWeekCardModel";
import { formatWeekdayFullFromDayKey } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

import {
  UI_BORDER_SUBTLE,
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import { ActivityWeeklyStepsBars } from "@/lib/ui/activity/ActivityWeeklyStepsBars";
import {
  ACTIVITY_OVERVIEW_LARGE_METRIC_FIGURE_STYLE,
  ACTIVITY_OVERVIEW_METRIC_QUALIFIER_STYLE,
} from "@/lib/ui/activity/activityUiTypography";

/** Matches {@link ActivityStepsAnalyticsCard} yearly bar track height. */
export const ACTIVITY_THIS_WEEK_BAR_TRACK_HEIGHT = 176;
const MONTH_LABEL_STACK_HEIGHT = 20;
/** Horizontal inset aligned with {@link ActivityStepsAnalyticsCard}. */
const CHART_PLOT_INSET_H = 8;

function formatStepsAxisLabel(v: number): string {
  const r = Math.round(v);
  if (r >= 10_000) return `${Math.round(r / 1000)}k`;
  return r.toLocaleString();
}

export type ActivityThisWeekCardProps = {
  loading: boolean;
  model: ActivityThisWeekCardModel | null;
  /**
   * Optional Daily Energy-style week-range label (e.g. `"May 17\u201323"`). When provided, prev/next
   * chevrons are rendered alongside it. Mirrors {@link EnergyThisWeekCard} so the two screens share
   * the same week-navigation UX without coupling component types.
   */
  weekRangeLabel?: string;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onPressPrevious?: () => void;
  onPressNext?: () => void;
  todayDayKey?: string;
};

const WEEKLY_AVG_STEPS_QUALIFIER = "avg steps per day";

export function ActivityThisWeekCard({
  loading,
  model,
  weekRangeLabel,
  canGoPrevious = true,
  canGoNext = false,
  onPressPrevious,
  onPressNext,
  todayDayKey,
}: ActivityThisWeekCardProps) {
  const resolvedTodayDayKey = todayDayKey ?? getTodayDayKeyLocal();

  const weeklyAverageA11yLine =
    !loading && model != null && !model.isEmpty && model.weeklyAverageMetricValue != null
      ? `${model.weeklyAverageMetricValue} ${WEEKLY_AVG_STEPS_QUALIFIER}`
      : null;

  const previousDisabled = !canGoPrevious || onPressPrevious == null;
  const nextDisabled = !canGoNext || onPressNext == null;

  const navCluster =
    weekRangeLabel != null ? (
      <View style={styles.weekNavRow} testID="activity-this-week-nav">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          accessibilityState={{ disabled: previousDisabled }}
          disabled={previousDisabled}
          onPress={onPressPrevious}
          hitSlop={10}
          testID="activity-this-week-nav-previous"
          style={({ pressed }) => [
            styles.weekNavButton,
            previousDisabled && styles.weekNavButtonDisabled,
            pressed && !previousDisabled && styles.weekNavButtonPressed,
          ]}
        >
          <Ionicons name="chevron-back" size={16} color={UI_TEXT_PRIMARY} />
        </Pressable>
        <Text
          style={styles.weekRangeLabel}
          numberOfLines={1}
          accessibilityLabel={`Week of ${weekRangeLabel}`}
          testID="activity-this-week-range-label"
        >
          {weekRangeLabel}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next week"
          accessibilityState={{ disabled: nextDisabled }}
          disabled={nextDisabled}
          onPress={onPressNext}
          hitSlop={10}
          testID="activity-this-week-nav-next"
          style={({ pressed }) => [
            styles.weekNavButton,
            nextDisabled && styles.weekNavButtonDisabled,
            pressed && !nextDisabled && styles.weekNavButtonPressed,
          ]}
        >
          <Ionicons name="chevron-forward" size={16} color={UI_TEXT_PRIMARY} />
        </Pressable>
      </View>
    ) : null;

  return (
    <View style={styles.wrap} accessible accessibilityLabel="This week's activity summary">
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          This Week&apos;s Activity
        </Text>
        {navCluster}
      </View>

      {!loading && model != null && !model.isEmpty && model.weeklyAverageMetricValue != null ? (
        <View style={styles.weekAvgMetricRow} testID="activity-this-week-average-steps">
          <Text
            style={styles.weekAvgFigure}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            testID="activity-this-week-average-metric-value"
          >
            {model.weeklyAverageMetricValue}
          </Text>
          <Text style={styles.weekAvgQualifier} numberOfLines={2}>
            {WEEKLY_AVG_STEPS_QUALIFIER}
          </Text>
        </View>
      ) : null}

      <View style={styles.divider} />

      {loading ? <LoadingState variant="inline" message="Loading steps…" /> : null}
      {!loading && model != null && model.isEmpty ? (
        <Text style={styles.placeholder}>No activity data this week yet</Text>
      ) : null}
      {!loading && model != null && !model.isEmpty ? (
        <View style={styles.chartSection}>
          <View
            style={[
              styles.chartPlotWrap,
              {
                minHeight:
                  ACTIVITY_THIS_WEEK_BAR_TRACK_HEIGHT + MONTH_LABEL_STACK_HEIGHT + 26 + 12,
              },
            ]}
            testID="activity-this-week-chart-plot"
          >
            <View style={styles.chartBarsBlock}>
              <View style={styles.chartBarsInner}>
                <ActivityWeeklyStepsBars
                  points={model.chartPoints}
                  barTrackHeight={ACTIVITY_THIS_WEEK_BAR_TRACK_HEIGHT}
                  maxScale={model.chartMaxScale}
                  baselineMeanStepsPerDay={model.baselineMeanStepsPerDay ?? 0}
                  todayDayKey={resolvedTodayDayKey}
                  formatValueLabel={formatStepsAxisLabel}
                />
                <View
                  style={styles.dowLabelsRow}
                  accessibilityLabel={
                    loading || model == null
                      ? "Weekday axis Sunday through Saturday"
                      : `This week's activity summary: ${weeklyAverageA11yLine ?? model.compactValuePrimary}`
                  }
                >
                  {model.chartPoints.map((p) => (
                    <View key={`dow-${p.dayKey}`} style={styles.dowLabelCol}>
                      <Text
                        style={styles.dowLabel}
                        accessibilityLabel={formatWeekdayFullFromDayKey(p.dayKey)}
                      >
                        {p.displayLabel}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 14,
    gap: 8,
    ...elevatedCardSurfaceStyle,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    ...strengthMetricCardTitleTextStyle,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER_SUBTLE,
    marginVertical: 4,
    alignSelf: "stretch",
  },
  placeholder: {
    fontSize: 15,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
    paddingBottom: 4,
  },
  chartSection: {
    width: "100%",
  },
  chartPlotWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    marginTop: 0,
  },
  chartBarsBlock: {
    flex: 1,
    minWidth: 0,
  },
  chartBarsInner: {
    width: "100%",
    paddingLeft: 0,
    paddingRight: 0,
  },
  dowLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
    paddingHorizontal: CHART_PLOT_INSET_H,
  },
  dowLabelCol: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
    maxWidth: 48,
  },
  dowLabel: {
    fontSize: 11,
    fontWeight: "400",
    color: "#AEAEB2",
    textAlign: "center",
  },
  weekAvgMetricRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 8,
    columnGap: 8,
    rowGap: 4,
    maxWidth: "100%",
  },
  weekAvgFigure: {
    ...ACTIVITY_OVERVIEW_LARGE_METRIC_FIGURE_STYLE,
    flexShrink: 0,
  },
  weekAvgQualifier: {
    ...ACTIVITY_OVERVIEW_METRIC_QUALIFIER_STYLE,
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 0,
  },
  weekNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  weekNavButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  weekNavButtonDisabled: {
    opacity: 0.35,
  },
  weekNavButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  weekRangeLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
    minWidth: 88,
    textAlign: "center",
  },
});
