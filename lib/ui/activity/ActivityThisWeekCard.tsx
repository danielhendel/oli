import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ActivityThisWeekCardModel } from "@/lib/data/activity/activityThisWeekCardModel";
import { formatWeekdayFullFromDayKey } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { StrengthFrequencyMetricCard } from "@/lib/ui/workouts/StrengthFrequencyMetricCard";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";

import { UI_BORDER_SUBTLE, UI_CARD_SURFACE, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
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
  onPressViewAll?: () => void;
};
const WEEKLY_AVG_STEPS_QUALIFIER = "avg steps per day";

export function ActivityThisWeekCard({ loading, model, onPressViewAll }: ActivityThisWeekCardProps) {
  const todayDayKey = getTodayDayKeyLocal();

  const weeklyAverageA11yLine =
    !loading && model != null && !model.isEmpty && model.weeklyAverageMetricValue != null
      ? `${model.weeklyAverageMetricValue} ${WEEKLY_AVG_STEPS_QUALIFIER}`
      : null;

  const metricCaption =
    !loading && model != null && !model.isEmpty && model.weeklyAverageMetricValue != null ? (
      <View style={styles.weekAvgMetricRow}>
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
    ) : null;

  return (
    <View style={styles.wrap}>
      <StrengthFrequencyMetricCard
        variant="embedded"
        headingTitle="This Week's Activity"
        loading={loading}
        model={
          loading || model == null
            ? null
            : {
                compactValuePrimary: model.compactValuePrimary,
                ratingLabel: model.ratingLabel,
                activityTierIndexForBar: model.activityTierIndexForBar,
                fillWidth01Override: model.fillWidth01Override,
              }
        }
        footerCaption=""
        showFrequencyTrack={false}
        showFrequencyMarkers={false}
        showFooterCaption={false}
        showRatingPill={false}
        compactTitlePillSpacing
        mutedMicroCaption={metricCaption}
        mutedCaptionAccessibilityLabel={weeklyAverageA11yLine}
        mutedMicroCaptionTestID="activity-this-week-average-steps"
        titleRowTrailing={
          onPressViewAll != null ? (
            <Pressable
              onPress={onPressViewAll}
              accessibilityRole="button"
              accessibilityLabel="View activity history"
              hitSlop={8}
              style={({ pressed }) => [
                workoutOverviewInCardHeaderStyles.linkHit,
                pressed && workoutOverviewInCardHeaderStyles.linkPressed,
              ]}
              testID="activity-this-week-view-all"
            >
              <Text style={workoutOverviewInCardHeaderStyles.link}>View All →</Text>
            </Pressable>
          ) : null
        }
        ratingPillTestID="activity-this-week-rating-pill"
        frequencyBarTestID="activity-this-week-frequency-bar"
        instrumentClusterTestID="activity-this-week-instrument-cluster"
      />
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
              { minHeight: ACTIVITY_THIS_WEEK_BAR_TRACK_HEIGHT + MONTH_LABEL_STACK_HEIGHT + 26 + 12 },
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
                  todayDayKey={todayDayKey}
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
    gap: 0,
    ...elevatedCardSurfaceStyle,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER_SUBTLE,
    marginVertical: 12,
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
});
