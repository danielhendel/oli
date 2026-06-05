import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { BodyYearlyWeightCardModel } from "@/lib/data/body/bodyYearlyWeightCardModel";
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

export const BODY_YEARLY_WEIGHT_TRACK_HEIGHT = 168;

export type BodyYearlyWeightCardProps = {
  loading: boolean;
  model: BodyYearlyWeightCardModel | null;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onPressPrevious?: () => void;
  onPressNext?: () => void;
  testID?: string;
};

/**
 * Body "{year} Weight" card — visual sibling of {@link ActivityYearlyCard} with year navigation,
 * but rendered as a monthly **weight line** instead of bars. Future-year navigation is bounded by
 * the parent screen; empty navigated years render a graceful empty state.
 */
export function BodyYearlyWeightCard({
  loading,
  model,
  canGoPrevious = true,
  canGoNext = false,
  onPressPrevious,
  onPressNext,
  testID = "body-yearly-card",
}: BodyYearlyWeightCardProps) {
  const previousDisabled = !canGoPrevious || onPressPrevious == null;
  const nextDisabled = !canGoNext || onPressNext == null;

  const heroA11y =
    !loading && model != null && model.hasData
      ? `${model.year} weight. Average ${model.averageDisplay} ${model.averageUnit}.${model.deltaLabel != null ? ` Change ${model.deltaLabel}.` : ""}`
      : !loading && model != null
        ? `${model.year} weight. No weight data yet.`
        : "Yearly weight summary. Loading.";

  const qualifier = model != null ? `avg ${model.averageUnit} in ${model.year}` : "";

  return (
    <View style={styles.wrap} accessible accessibilityLabel={heroA11y} testID={testID}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle} accessibilityRole="header" testID="body-yearly-title">
          {model != null ? model.title : "Yearly Weight"}
        </Text>
        {model != null ? (
          <View style={styles.yearNavRow} testID="body-yearly-nav">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous year"
              accessibilityState={{ disabled: previousDisabled }}
              disabled={previousDisabled}
              onPress={onPressPrevious}
              hitSlop={10}
              testID="body-yearly-nav-previous"
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
              testID="body-yearly-range-label"
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
              testID="body-yearly-nav-next"
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
        <View style={styles.heroMetricRow} testID="body-yearly-average">
          <Text
            style={styles.heroFigure}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            testID="body-yearly-average-metric-value"
          >
            {model.averageDisplay}
          </Text>
          <Text style={styles.heroQualifier} numberOfLines={2}>
            {qualifier}
          </Text>
          {model.deltaLabel != null ? (
            <Text style={styles.heroDelta} testID="body-yearly-delta">
              {model.deltaLabel}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.divider} />

      {loading ? <LoadingState variant="inline" message="Loading weight…" /> : null}
      {!loading && model != null && !model.hasData ? (
        <Text style={styles.placeholder} testID="body-yearly-empty-state">
          No weight data for {model.rangeLabel} yet
        </Text>
      ) : null}
      {!loading && model != null && model.hasData ? (
        <View style={styles.chartSection} testID="body-yearly-chart">
          <BodyWeightLineChart
            unit={model.averageUnit}
            trackHeight={BODY_YEARLY_WEIGHT_TRACK_HEIGHT}
            testID="body-yearly-line-chart"
            accessibilityLabel={`${model.year} monthly weight line`}
            columns={model.months.map((m) => ({
              label: m.label,
              valueKg: m.averageKg,
              isFuture: m.isFutureMonth,
              isCurrent: m.isCurrentMonth,
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
  heroMetricRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
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
    minWidth: 0,
  },
  heroDelta: {
    fontSize: 14,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
    fontVariant: ["tabular-nums"],
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
