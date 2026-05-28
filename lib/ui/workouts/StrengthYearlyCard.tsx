import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { StrengthYearlyCardModel } from "@/lib/data/workouts/strengthYearlyCardModel";
import { LoadingState } from "@/lib/ui/ScreenStates";
import {
  ACTIVITY_OVERVIEW_LARGE_METRIC_FIGURE_STYLE,
  ACTIVITY_OVERVIEW_METRIC_QUALIFIER_STYLE,
} from "@/lib/ui/activity/activityUiTypography";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_SUBTLE,
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { StrengthYearlyMonthBars } from "@/lib/ui/workouts/StrengthYearlyMonthBars";

/**
 * Yearly Strength card — visual sibling of {@link ActivityYearlyCard}.
 *
 * Layout reuses the same dark surface, paddings, divider, hero typography, and chevron nav
 * cluster styling so the card stacks cleanly under the Strength Baseline card. The chart itself
 * uses {@link StrengthYearlyMonthBars} (12 month-letter columns, Oli blue).
 *
 * State (selected year, can-go-prev/next, handlers) is owned by the parent screen — this
 * component is presentation-only.
 */

/** Same track height as the Activity yearly chart for vertical rhythm parity. */
export const STRENGTH_YEARLY_BAR_TRACK_HEIGHT = 176;
const MONTH_LABEL_STACK_HEIGHT = 20;
const CHART_PLOT_INSET_H = 8;

export type StrengthYearlyCardProps = {
  loading: boolean;
  model: StrengthYearlyCardModel | null;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onPressPrevious?: () => void;
  onPressNext?: () => void;
};

export function StrengthYearlyCard({
  loading,
  model,
  canGoPrevious = true,
  canGoNext = false,
  onPressPrevious,
  onPressNext,
}: StrengthYearlyCardProps) {
  const previousDisabled = !canGoPrevious || onPressPrevious == null;
  const nextDisabled = !canGoNext || onPressNext == null;

  const heroA11y =
    !loading && model != null && model.hasData
      ? `${model.year}. ${model.totalDisplay} ${model.totalQualifier}.`
      : !loading && model != null
        ? `${model.year}. No strength workouts yet.`
        : `Yearly strength summary. Loading.`;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={heroA11y}
      testID="workouts-yearly-card"
    >
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle} accessibilityRole="header" testID="workouts-yearly-title">
          {model != null ? model.title : "Yearly Strength"}
        </Text>
        {model != null ? (
          <View style={styles.yearNavRow} testID="workouts-yearly-nav">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous year"
              accessibilityState={{ disabled: previousDisabled }}
              disabled={previousDisabled}
              onPress={onPressPrevious}
              hitSlop={10}
              testID="workouts-yearly-nav-previous"
              style={({ pressed }) => [
                styles.yearNavButton,
                previousDisabled && styles.yearNavButtonDisabled,
                pressed && !previousDisabled && styles.yearNavButtonPressed,
              ]}
            >
              <Ionicons name="chevron-back" size={16} color={UI_TEXT_PRIMARY} />
            </Pressable>
            <Text
              style={styles.yearRangeLabel}
              numberOfLines={1}
              accessibilityLabel={`Year ${model.rangeLabel}`}
              testID="workouts-yearly-range-label"
            >
              {model.rangeLabel}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next year"
              accessibilityState={{ disabled: nextDisabled }}
              disabled={nextDisabled}
              onPress={onPressNext}
              hitSlop={10}
              testID="workouts-yearly-nav-next"
              style={({ pressed }) => [
                styles.yearNavButton,
                nextDisabled && styles.yearNavButtonDisabled,
                pressed && !nextDisabled && styles.yearNavButtonPressed,
              ]}
            >
              <Ionicons name="chevron-forward" size={16} color={UI_TEXT_PRIMARY} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {!loading && model != null && model.hasData ? (
        <View style={styles.heroMetricRow} testID="workouts-yearly-total-metric">
          <Text
            style={styles.heroFigure}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            testID="workouts-yearly-total-metric-value"
          >
            {model.totalDisplay}
          </Text>
          <Text style={styles.heroQualifier} numberOfLines={2}>
            {model.totalQualifier}
          </Text>
        </View>
      ) : null}

      <View style={styles.divider} />

      {loading ? <LoadingState variant="inline" message="Loading workouts…" /> : null}
      {!loading && model != null && !model.hasData ? (
        <Text style={styles.placeholder} testID="workouts-yearly-empty-state">
          No strength workouts for {model.rangeLabel} yet
        </Text>
      ) : null}
      {!loading && model != null && model.hasData ? (
        <View style={styles.chartSection}>
          <View
            style={[
              styles.chartPlotWrap,
              {
                minHeight:
                  STRENGTH_YEARLY_BAR_TRACK_HEIGHT + MONTH_LABEL_STACK_HEIGHT + 26 + 12,
              },
            ]}
            testID="workouts-yearly-chart-plot"
          >
            <View style={styles.chartBarsBlock}>
              <View style={styles.chartBarsInner}>
                <StrengthYearlyMonthBars
                  months={model.months}
                  barTrackHeight={STRENGTH_YEARLY_BAR_TRACK_HEIGHT}
                  maxScale={model.chartMaxScale}
                  todayMonthKey={model.todayMonthKey}
                />
                <View
                  style={styles.monthLabelsRow}
                  accessibilityLabel="Month axis January through December"
                  testID="workouts-yearly-month-labels"
                >
                  {model.months.map((m) => (
                    <View key={`lbl-${m.monthKey}`} style={styles.monthLabelCol}>
                      <Text
                        style={styles.monthLabel}
                        accessibilityLabel={`Month ${m.monthKey}`}
                      >
                        {m.label}
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
  monthLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
    paddingHorizontal: CHART_PLOT_INSET_H,
  },
  monthLabelCol: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
    maxWidth: 28,
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: "400",
    color: UI_TEXT_TERTIARY_LABEL,
    textAlign: "center",
  },
  heroMetricRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 8,
    columnGap: 8,
    rowGap: 4,
    maxWidth: "100%",
  },
  heroFigure: {
    ...ACTIVITY_OVERVIEW_LARGE_METRIC_FIGURE_STYLE,
    flexShrink: 0,
  },
  heroQualifier: {
    ...ACTIVITY_OVERVIEW_METRIC_QUALIFIER_STYLE,
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 0,
  },
  yearNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  yearNavButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  yearNavButtonDisabled: {
    opacity: 0.35,
  },
  yearNavButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  yearRangeLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
    minWidth: 88,
    textAlign: "center",
  },
});
