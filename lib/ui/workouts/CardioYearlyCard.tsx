import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { CardioYearlyCardModel } from "@/lib/data/workouts/cardioYearlyCardModel";
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
import { CardioYearlyMonthBars } from "@/lib/ui/workouts/CardioYearlyMonthBars";

/** Same track height as the Strength yearly chart for vertical rhythm parity. */
export const CARDIO_YEARLY_BAR_TRACK_HEIGHT = 176;
const MONTH_LABEL_STACK_HEIGHT = 20;
const CHART_PLOT_INSET_H = 8;

export type CardioYearlyCardProps = {
  loading: boolean;
  model: CardioYearlyCardModel | null;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onPressPrevious?: () => void;
  onPressNext?: () => void;
  /**
   * Optional placeholder copy for prior years where the backend hasn't surfaced monthly
   * mileage rollups yet. When omitted, the standard "no cardio for {year} yet" empty-state
   * applies.
   */
  priorYearPlaceholder?: string;
};

/**
 * Yearly Cardio card — visual sibling of {@link StrengthYearlyCard} and `ActivityYearlyCard`.
 * Presentation-only: state (selected year, can-go-prev/next, handlers) is owned by the parent.
 */
export function CardioYearlyCard({
  loading,
  model,
  canGoPrevious = true,
  canGoNext = false,
  onPressPrevious,
  onPressNext,
  priorYearPlaceholder,
}: CardioYearlyCardProps) {
  const previousDisabled = !canGoPrevious || onPressPrevious == null;
  const nextDisabled = !canGoNext || onPressNext == null;

  const heroA11y =
    !loading && model != null && model.hasData
      ? `${model.year}. ${model.totalDisplay} ${model.totalQualifier}.`
      : !loading && model != null
        ? `${model.year}. No cardio yet.`
        : `Yearly cardio summary. Loading.`;

  const emptyCopy =
    model != null && !model.isCurrentYear && priorYearPlaceholder != null
      ? priorYearPlaceholder
      : model != null
        ? `No cardio for ${model.rangeLabel} yet`
        : "";

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={heroA11y}
      testID="cardio-yearly-card"
    >
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle} accessibilityRole="header" testID="cardio-yearly-title">
          {model != null ? model.title : "Yearly Cardio"}
        </Text>
        {model != null ? (
          <View style={styles.yearNavRow} testID="cardio-yearly-nav">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous year"
              accessibilityState={{ disabled: previousDisabled }}
              disabled={previousDisabled}
              onPress={onPressPrevious}
              hitSlop={10}
              testID="cardio-yearly-nav-previous"
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
              testID="cardio-yearly-range-label"
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
              testID="cardio-yearly-nav-next"
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
        <View style={styles.heroMetricRow} testID="cardio-yearly-total-metric">
          <Text
            style={styles.heroFigure}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            testID="cardio-yearly-total-metric-value"
          >
            {model.totalDisplay}
          </Text>
          <Text style={styles.heroQualifier} numberOfLines={2}>
            {model.totalQualifier}
          </Text>
        </View>
      ) : null}

      <View style={styles.divider} />

      {loading ? <LoadingState variant="inline" message="Loading cardio…" /> : null}
      {!loading && model != null && !model.hasData ? (
        <Text style={styles.placeholder} testID="cardio-yearly-empty-state">
          {emptyCopy}
        </Text>
      ) : null}
      {!loading && model != null && model.hasData ? (
        <View style={styles.chartSection}>
          <View
            style={[
              styles.chartPlotWrap,
              {
                minHeight:
                  CARDIO_YEARLY_BAR_TRACK_HEIGHT + MONTH_LABEL_STACK_HEIGHT + 26 + 12,
              },
            ]}
            testID="cardio-yearly-chart-plot"
          >
            <View style={styles.chartBarsBlock}>
              <View style={styles.chartBarsInner}>
                <CardioYearlyMonthBars
                  months={model.months}
                  barTrackHeight={CARDIO_YEARLY_BAR_TRACK_HEIGHT}
                  maxScale={model.chartMaxScale}
                  todayMonthKey={model.todayMonthKey}
                />
                <View
                  style={styles.monthLabelsRow}
                  accessibilityLabel="Month axis January through December"
                  testID="cardio-yearly-month-labels"
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
