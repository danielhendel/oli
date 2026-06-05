import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { BodyWeeklyWeightCardModel } from "@/lib/data/body/bodyWeeklyWeightCardModel";
import { BodyWeightLineChart } from "@/lib/ui/body/BodyWeightLineChart";
import {
  ACTIVITY_OVERVIEW_LARGE_METRIC_FIGURE_STYLE,
  ACTIVITY_OVERVIEW_METRIC_QUALIFIER_STYLE,
} from "@/lib/ui/activity/activityUiTypography";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  UI_BORDER_SUBTLE,
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export const BODY_WEEKLY_WEIGHT_TRACK_HEIGHT = 168;

export type BodyWeeklyWeightCardProps = {
  loading: boolean;
  model: BodyWeeklyWeightCardModel | null;
  unit: "kg" | "lb";
  weekRangeLabel?: string;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onPressPrevious?: () => void;
  onPressNext?: () => void;
  testID?: string;
};

/**
 * Body "This Week's Weight" card — visual sibling of {@link ActivityThisWeekCard} (same surface,
 * header, week-nav cluster, hero typography) but renders a daily **weight line** instead of bars.
 * Missing days are skipped by the line; future-week navigation is bounded by the parent screen.
 */
export function BodyWeeklyWeightCard({
  loading,
  model,
  unit,
  weekRangeLabel,
  canGoPrevious = true,
  canGoNext = false,
  onPressPrevious,
  onPressNext,
  testID = "body-this-week-card",
}: BodyWeeklyWeightCardProps) {
  const previousDisabled = !canGoPrevious || onPressPrevious == null;
  const nextDisabled = !canGoNext || onPressNext == null;

  const qualifier = `avg ${unit} this week`;

  const navCluster =
    weekRangeLabel != null ? (
      <View style={styles.weekNavRow} testID="body-this-week-nav">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          accessibilityState={{ disabled: previousDisabled }}
          disabled={previousDisabled}
          onPress={onPressPrevious}
          hitSlop={10}
          testID="body-this-week-nav-previous"
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
          testID="body-this-week-range-label"
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
          testID="body-this-week-nav-next"
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

  const showAverage =
    !loading && model != null && !model.isEmpty && model.weeklyAverageMetricValue != null;

  return (
    <View style={styles.wrap} accessible accessibilityLabel="This week's weight summary" testID={testID}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          This Week&apos;s Weight
        </Text>
        {navCluster}
      </View>

      {showAverage ? (
        <View style={styles.weekAvgMetricRow} testID="body-this-week-average">
          <Text
            style={styles.weekAvgFigure}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            testID="body-this-week-average-metric-value"
          >
            {model!.weeklyAverageMetricValue}
          </Text>
          <Text style={styles.weekAvgQualifier} numberOfLines={2}>
            {qualifier}
          </Text>
        </View>
      ) : null}

      <View style={styles.divider} />

      {loading ? <LoadingState variant="inline" message="Loading weight…" /> : null}
      {!loading && model != null && model.isEmpty ? (
        <Text style={styles.placeholder} testID="body-this-week-empty-state">
          No weight readings this week yet
        </Text>
      ) : null}
      {!loading && model != null && !model.isEmpty ? (
        <View style={styles.chartSection} testID="body-this-week-chart">
          <BodyWeightLineChart
            unit={unit}
            trackHeight={BODY_WEEKLY_WEIGHT_TRACK_HEIGHT}
            testID="body-this-week-line-chart"
            accessibilityLabel={`This week's weight line, ${model.measuredDayCount} of 7 days measured`}
            columns={model.chartPoints.map((p) => ({
              label: p.displayLabel,
              valueKg: p.weightKg,
              isFuture: p.isFutureDay,
            }))}
          />
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
  weekAvgMetricRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
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
