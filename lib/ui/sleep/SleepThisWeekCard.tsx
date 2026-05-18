import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { WeeklySleepVm } from "@/lib/data/sleep/buildWeeklySleepVm";
import { formatWeekdayFullFromDayKey } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

import { UI_BORDER_SUBTLE, UI_CARD_SURFACE, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import {
  ACTIVITY_OVERVIEW_LARGE_METRIC_FIGURE_STYLE,
  ACTIVITY_OVERVIEW_METRIC_QUALIFIER_STYLE,
} from "@/lib/ui/activity/activityUiTypography";
import { SleepWeeklyDurationBars } from "@/lib/ui/sleep/SleepWeeklyDurationBars";

export const SLEEP_THIS_WEEK_BAR_TRACK_HEIGHT = 176;
const MONTH_LABEL_STACK_HEIGHT = 20;
const CHART_PLOT_INSET_H = 8;

const WEEKLY_AVG_SLEEP_QUALIFIER = "avg / night";

export type SleepThisWeekCardProps = {
  loading: boolean;
  model: WeeklySleepVm;
  testID?: string;
};

export function SleepThisWeekCard({
  loading,
  model,
  testID = "sleep-this-week-card",
}: SleepThisWeekCardProps) {
  const todayDayKey = getTodayDayKeyLocal();

  const weeklyAverageA11yLine =
    !loading && !model.isEmpty && model.weeklyAverageText != null
      ? `${model.weeklyAverageText} ${WEEKLY_AVG_SLEEP_QUALIFIER}`
      : null;

  const metricCaption =
    !loading && !model.isEmpty && model.weeklyAverageText != null ? (
      <View style={styles.weekAvgMetricRow}>
        <Text
          style={styles.weekAvgFigure}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          testID="sleep-this-week-average-metric-value"
        >
          {model.weeklyAverageText}
        </Text>
        <Text style={styles.weekAvgQualifier} numberOfLines={2}>
          {WEEKLY_AVG_SLEEP_QUALIFIER}
        </Text>
      </View>
    ) : null;

  return (
    <View style={styles.wrap} testID={testID} accessible accessibilityLabel="This week's sleep summary">
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          This Week&apos;s Sleep
        </Text>
      </View>
      {metricCaption}
      <View style={styles.divider} />
      {loading ? <LoadingState variant="inline" message="Loading sleep…" /> : null}
      {!loading && model.isEmpty ? (
        <Text style={styles.placeholder}>No completed sleep this week yet</Text>
      ) : null}
      {!loading && !model.isEmpty ? (
        <View style={styles.chartSection}>
          <View
            style={[
              styles.chartPlotWrap,
              { minHeight: SLEEP_THIS_WEEK_BAR_TRACK_HEIGHT + MONTH_LABEL_STACK_HEIGHT + 26 + 12 },
            ]}
            testID="sleep-this-week-chart-plot"
          >
            <View style={styles.chartBarsBlock}>
              <View style={styles.chartBarsInner}>
                <SleepWeeklyDurationBars
                  points={model.chartPoints}
                  barTrackHeight={SLEEP_THIS_WEEK_BAR_TRACK_HEIGHT}
                  maxScale={model.chartMaxScale}
                  todayDayKey={todayDayKey}
                />
                <View
                  style={styles.dowLabelsRow}
                  accessibilityLabel={
                    weeklyAverageA11yLine ?? "Weekday axis Sunday through Saturday"
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
  },
  chartBarsBlock: {
    flex: 1,
    minWidth: 0,
  },
  chartBarsInner: {
    width: "100%",
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
});
