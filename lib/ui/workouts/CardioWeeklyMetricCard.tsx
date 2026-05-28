import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ActivityWeeklyStepsBars } from "@/lib/ui/activity/ActivityWeeklyStepsBars";
import {
  ACTIVITY_OVERVIEW_LARGE_METRIC_FIGURE_STYLE,
  ACTIVITY_OVERVIEW_METRIC_QUALIFIER_STYLE,
} from "@/lib/ui/activity/activityUiTypography";
import type { CardioWeeklyMetricCardModel } from "@/lib/data/workouts/cardioWeeklyMetricCardModel";
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
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

/** Same fixed track height as Activity / Cardio Today design. */
export const CARDIO_WEEKLY_METRIC_BAR_TRACK_HEIGHT = 176;
const MONTH_LABEL_STACK_HEIGHT = 20;
const CHART_PLOT_INSET_H = 8;

export type CardioWeeklyMetricCardProps = {
  /** Card heading. */
  title: string;
  loading: boolean;
  model: CardioWeeklyMetricCardModel | null;
  /** Display unit for headline figure / bar labels (e.g. `"mi"`, `"min"`). */
  unit: "mi" | "min";
  /**
   * Week-range label like `"May 17\u201323"` from
   * {@link computeEnergyWeekNavigationState}. When provided, prev/next chevrons render
   * alongside it.
   */
  weekRangeLabel?: string;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onPressPrevious?: () => void;
  onPressNext?: () => void;
  todayDayKey?: string;
  /** Per-bar value label formatter (e.g. `"3.1"` for miles, `"35"` for minutes). */
  formatBarLabel: (value: number) => string;
  /** Empty-state placeholder copy when no qualifying cardio sessions exist this week. */
  emptyPlaceholder: string;
  /** Stable test id root (e.g. `"cardio-weekly-distance"` / `"cardio-weekly-duration"`). */
  testIDRoot: string;
};

function unitQualifierLabel(unit: "mi" | "min"): string {
  return unit === "mi" ? "total" : "min total";
}

function formatTotalFigure(model: CardioWeeklyMetricCardModel, unit: "mi" | "min"): string {
  if (unit === "mi") return `${model.totalNumeric.toFixed(1)} mi`;
  return `${Math.round(model.totalNumeric)}`;
}

export function CardioWeeklyMetricCard({
  title,
  loading,
  model,
  unit,
  weekRangeLabel,
  canGoPrevious = true,
  canGoNext = false,
  onPressPrevious,
  onPressNext,
  todayDayKey,
  formatBarLabel,
  emptyPlaceholder,
  testIDRoot,
}: CardioWeeklyMetricCardProps) {
  const resolvedTodayDayKey = todayDayKey ?? getTodayDayKeyLocal();

  const previousDisabled = !canGoPrevious || onPressPrevious == null;
  const nextDisabled = !canGoNext || onPressNext == null;

  const navCluster =
    weekRangeLabel != null ? (
      <View style={styles.weekNavRow} testID={`${testIDRoot}-nav`}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          accessibilityState={{ disabled: previousDisabled }}
          disabled={previousDisabled}
          onPress={onPressPrevious}
          hitSlop={10}
          testID={`${testIDRoot}-nav-previous`}
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
          testID={`${testIDRoot}-range-label`}
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
          testID={`${testIDRoot}-nav-next`}
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
    <View style={styles.wrap} accessible accessibilityLabel={`${title} summary`}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          {title}
        </Text>
        {navCluster}
      </View>

      {!loading && model != null && !model.isEmpty ? (
        <View style={styles.totalRow} testID={`${testIDRoot}-total`}>
          <Text
            style={styles.totalFigure}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            testID={`${testIDRoot}-total-value`}
          >
            {formatTotalFigure(model, unit)}
          </Text>
          <Text style={styles.totalQualifier} numberOfLines={2}>
            {unitQualifierLabel(unit)}
          </Text>
        </View>
      ) : null}

      <View style={styles.divider} />

      {loading ? <LoadingState variant="inline" message="Loading…" /> : null}
      {!loading && model != null && model.isEmpty ? (
        <Text style={styles.placeholder} testID={`${testIDRoot}-empty`}>
          {emptyPlaceholder}
        </Text>
      ) : null}
      {!loading && model != null && !model.isEmpty ? (
        <View style={styles.chartSection}>
          <View
            style={[
              styles.chartPlotWrap,
              {
                minHeight:
                  CARDIO_WEEKLY_METRIC_BAR_TRACK_HEIGHT + MONTH_LABEL_STACK_HEIGHT + 26 + 12,
              },
            ]}
            testID={`${testIDRoot}-chart-plot`}
          >
            <View style={styles.chartBarsBlock}>
              <View style={styles.chartBarsInner}>
                <ActivityWeeklyStepsBars
                  points={model.chartPoints}
                  barTrackHeight={CARDIO_WEEKLY_METRIC_BAR_TRACK_HEIGHT}
                  maxScale={model.chartMaxScale}
                  baselineMeanStepsPerDay={0}
                  todayDayKey={resolvedTodayDayKey}
                  formatValueLabel={formatBarLabel}
                />
                <View
                  style={styles.dowLabelsRow}
                  accessibilityLabel={`${title}: ${model.totalLabel}`}
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
    color: UI_TEXT_TERTIARY_LABEL,
    textAlign: "center",
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 8,
    columnGap: 8,
    rowGap: 4,
    maxWidth: "100%",
  },
  totalFigure: {
    ...ACTIVITY_OVERVIEW_LARGE_METRIC_FIGURE_STYLE,
    flexShrink: 0,
  },
  totalQualifier: {
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
