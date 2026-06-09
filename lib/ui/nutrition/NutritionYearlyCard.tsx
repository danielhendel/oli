import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NutritionYearlyCardModel } from "@/lib/data/nutrition/nutritionYearlyCardModel";
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
import { NUTRITION_ACCENT } from "@/lib/ui/nutrition/nutritionOverviewTheme";

type Props = {
  loading: boolean;
  model: NutritionYearlyCardModel | null;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onPressPrevious?: () => void;
  onPressNext?: () => void;
};

const BAR_TRACK_HEIGHT = 120;

export function NutritionYearlyCard({
  loading,
  model,
  canGoPrevious = true,
  canGoNext = false,
  onPressPrevious,
  onPressNext,
}: Props) {
  const previousDisabled = !canGoPrevious || onPressPrevious == null;
  const nextDisabled = !canGoNext || onPressNext == null;

  return (
    <View style={styles.wrap} testID="nutrition-yearly-card" accessible accessibilityLabel="Yearly nutrition summary">
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          {model != null ? model.title : "Yearly Nutrition"}
        </Text>
        {model != null ? (
          <View style={styles.yearNavRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous year"
              accessibilityState={{ disabled: previousDisabled }}
              disabled={previousDisabled}
              onPress={onPressPrevious}
              hitSlop={10}
              style={({ pressed }) => [
                styles.yearNavButton,
                previousDisabled && styles.yearNavButtonDisabled,
                pressed && !previousDisabled && styles.yearNavButtonPressed,
              ]}
            >
              <Ionicons name="chevron-back" size={16} color={UI_TEXT_PRIMARY} />
            </Pressable>
            <Text style={styles.yearRangeLabel}>{model.rangeLabel}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next year"
              accessibilityState={{ disabled: nextDisabled }}
              disabled={nextDisabled}
              onPress={onPressNext}
              hitSlop={10}
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

      {loading ? (
        <LoadingState variant="inline" message="Loading yearly nutrition…" />
      ) : model == null ? null : model.isEmpty ? (
        <Text style={styles.emptyMessage}>No nutrition logged in {model.year} yet.</Text>
      ) : (
        <>
          <View style={styles.heroRow}>
            <Text style={ACTIVITY_OVERVIEW_LARGE_METRIC_FIGURE_STYLE}>{model.totalDisplay}</Text>
            <Text style={ACTIVITY_OVERVIEW_METRIC_QUALIFIER_STYLE}>{model.totalQualifier}</Text>
          </View>
          <View style={styles.chartRow}>
            {model.months.map((m) => {
              const fill = model.chartMaxScale > 0 ? m.daysLogged / model.chartMaxScale : 0;
              const barH = Math.max(4, Math.round(fill * BAR_TRACK_HEIGHT));
              return (
                <View key={m.monthKey} style={styles.monthCol} accessibilityLabel={`${m.label}. ${m.daysLogged} days logged.`}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: barH },
                        m.isFutureMonth && styles.barFuture,
                        m.isCurrentMonth && styles.barCurrent,
                      ]}
                    />
                  </View>
                  <Text style={[styles.monthLabel, m.isFutureMonth && styles.monthLabelMuted]}>{m.label}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}
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
    gap: 12,
    ...elevatedCardSurfaceStyle,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: strengthMetricCardTitleTextStyle,
  yearNavRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  yearNavButton: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
  yearNavButtonDisabled: { opacity: 0.35 },
  yearNavButtonPressed: { opacity: 0.7 },
  yearRangeLabel: { fontSize: 14, fontWeight: "600", color: UI_TEXT_SECONDARY, minWidth: 48, textAlign: "center" },
  heroRow: { gap: 2 },
  emptyMessage: { fontSize: 15, color: UI_TEXT_SECONDARY, lineHeight: 21 },
  chartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_SUBTLE,
    paddingTop: 12,
  },
  monthCol: { flex: 1, alignItems: "center", gap: 6 },
  barTrack: { height: BAR_TRACK_HEIGHT, width: "70%", justifyContent: "flex-end" },
  barFill: { width: "100%", backgroundColor: NUTRITION_ACCENT, borderRadius: 3 },
  barFuture: { opacity: 0.25 },
  barCurrent: { opacity: 1 },
  monthLabel: { fontSize: 11, fontWeight: "600", color: UI_TEXT_TERTIARY_LABEL },
  monthLabelMuted: { opacity: 0.4 },
});
