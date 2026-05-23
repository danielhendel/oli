import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { WeeklyEnergyVm } from "@/lib/data/dash/buildWeeklyEnergyVm";
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
import {
  ACTIVITY_OVERVIEW_LARGE_METRIC_FIGURE_STYLE,
  ACTIVITY_OVERVIEW_METRIC_QUALIFIER_STYLE,
} from "@/lib/ui/activity/activityUiTypography";
import {
  ENERGY_RANGE_BAR_LABEL_OVERHEAD_PX,
  EnergyWeeklyRangeBars,
} from "@/lib/ui/energy/EnergyWeeklyRangeBars";

export const ENERGY_THIS_WEEK_BAR_TRACK_HEIGHT = 176;
const CHART_PLOT_INSET_H = 8;
const DOW_AXIS_MARGIN_TOP_PX = 18;
const DOW_AXIS_LABEL_LINE_HEIGHT_PX = 14;

export type EnergyThisWeekCardProps = {
  loading: boolean;
  model: WeeklyEnergyVm;
  testID?: string;
  /**
   * Optional week-range label shown right-aligned with the title (e.g. `"May 17\u201323"`).
   * When provided, the previous / next chevrons are rendered alongside it.
   * When omitted, the card renders exactly as before (backwards-compatible default).
   */
  weekRangeLabel?: string;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onPressPrevious?: () => void;
  onPressNext?: () => void;
};

export function EnergyThisWeekCard({
  loading,
  model,
  testID = "energy-this-week-card",
  weekRangeLabel,
  canGoPrevious = true,
  canGoNext = false,
  onPressPrevious,
  onPressNext,
}: EnergyThisWeekCardProps) {
  const todayDayKey = getTodayDayKeyLocal();

  const weeklyAverageA11yLine =
    !loading && !model.isEmpty && model.weeklyAverageRangeText != null
      ? `${model.weeklyAverageRangeText} ${model.weeklyAverageQualifier}`
      : null;

  const metricCaption =
    !loading && !model.isEmpty && model.weeklyAverageRangeText != null ? (
      <View style={styles.weekAvgMetricRow}>
        <Text
          style={styles.weekAvgFigure}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          testID="energy-this-week-average-metric-value"
        >
          {model.weeklyAverageRangeText}
        </Text>
        <Text style={styles.weekAvgQualifier} numberOfLines={2}>
          {model.weeklyAverageQualifier}
        </Text>
      </View>
    ) : null;

  const previousDisabled = !canGoPrevious || onPressPrevious == null;
  const nextDisabled = !canGoNext || onPressNext == null;

  const navCluster = weekRangeLabel != null ? (
    <View style={styles.weekNavRow} testID="energy-this-week-nav">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous week"
        accessibilityState={{ disabled: previousDisabled }}
        disabled={previousDisabled}
        onPress={onPressPrevious}
        hitSlop={10}
        testID="energy-this-week-nav-previous"
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
        testID="energy-this-week-range-label"
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
        testID="energy-this-week-nav-next"
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
    <View style={styles.wrap} testID={testID} accessible accessibilityLabel="This week's energy summary">
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          This Week&apos;s Energy
        </Text>
        {navCluster}
      </View>
      {metricCaption}
      <View style={styles.divider} />
      {loading ? <LoadingState variant="inline" message="Loading energy…" /> : null}
      {!loading && model.isEmpty ? (
        <Text style={styles.placeholder}>No daily energy this week yet</Text>
      ) : null}
      {!loading && !model.isEmpty ? (
        <View style={styles.chartSection}>
          <View
            style={[
              styles.chartPlotWrap,
              {
                minHeight:
                  ENERGY_THIS_WEEK_BAR_TRACK_HEIGHT +
                  ENERGY_RANGE_BAR_LABEL_OVERHEAD_PX +
                  DOW_AXIS_MARGIN_TOP_PX +
                  DOW_AXIS_LABEL_LINE_HEIGHT_PX,
              },
            ]}
            testID="energy-this-week-chart-plot"
          >
            <View style={styles.chartBarsBlock}>
              <View style={styles.chartBarsInner}>
                <EnergyWeeklyRangeBars
                  points={model.chartPoints}
                  barTrackHeight={ENERGY_THIS_WEEK_BAR_TRACK_HEIGHT}
                  chartMin={model.chartMin}
                  chartMax={model.chartMax}
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
    marginTop: DOW_AXIS_MARGIN_TOP_PX,
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
