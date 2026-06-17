import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NutritionTodayCardModel, NutritionTodayMetricRow } from "@/lib/data/nutrition/nutritionTodayCardModel";
import type { NutritionMacroKey } from "@/lib/data/nutrition/nutritionGoals";
import type { NutritionTodayFactsUi } from "@/lib/data/nutrition/nutritionOverviewUi";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { LinearProgressBar } from "@/lib/ui/primitives/LinearProgressBar";
import { NUTRITION_ACCENT, NUTRITION_PROGRESS_TRACK_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { friendlyNutritionOverviewErrorMessage } from "@/lib/ui/nutrition/nutritionOverviewErrors";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

const PROGRESS_H = 6;
const PROGRESS_R = 4;

function isMacroKey(key: string): key is NutritionMacroKey {
  return key === "protein" || key === "carbs" || key === "fat";
}

type NutritionTodayCardProps = {
  model: NutritionTodayCardModel;
  todayFacts: NutritionTodayFactsUi;
  /** Main heading — usually "Today" when the strip selection matches the calendar anchor day. */
  headingTitle?: string;
  loading?: boolean;
  onRetryFacts?: () => void;
  /** When true, DailyFacts is still catching up after a log mutation. */
  totalsSyncing?: boolean;
  /** Opens the View Food day page. When omitted, the header link is hidden. */
  onViewMore?: () => void;
  /** Navigates to a per-macro detail page. When omitted, macro rows render static (no chevron). */
  onPressMacro?: (macro: NutritionMacroKey) => void;
};

export function NutritionTodayCard({
  model,
  todayFacts,
  headingTitle = "Today",
  loading = false,
  onRetryFacts,
  totalsSyncing = false,
  onViewMore,
  onPressMacro,
}: NutritionTodayCardProps) {
  const macroRows = model.rows.filter((r): r is NutritionTodayMetricRow => isMacroKey(r.key));

  return (
    <View style={styles.card} testID="nutrition-today-card">
      <View style={workoutOverviewInCardHeaderStyles.row}>
        <Text style={workoutOverviewInCardHeaderStyles.title}>{headingTitle}</Text>
        {onViewMore != null ? (
          <Pressable
            onPress={onViewMore}
            accessibilityRole="button"
            accessibilityLabel="View food for this day"
            hitSlop={8}
            style={({ pressed }) => [
              workoutOverviewInCardHeaderStyles.linkHit,
              pressed && workoutOverviewInCardHeaderStyles.linkPressed,
            ]}
            testID="nutrition-today-view-food-cta"
          >
            <Text style={workoutOverviewInCardHeaderStyles.link}>View Food</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? <LoadingState variant="inline" message="Loading nutrition…" /> : null}
      {!loading && todayFacts.isLoading ? (
        <LoadingState message="Loading today's summary…" variant="inline" />
      ) : !loading && todayFacts.readiness === "error" ? (
        <ErrorState
          variant="inline"
          title="Could not load today’s summary"
          message={friendlyNutritionOverviewErrorMessage(todayFacts.message)}
          requestId={todayFacts.requestId}
          {...(onRetryFacts != null ? { onRetry: onRetryFacts } : {})}
        />
      ) : !loading ? (
        <>
          {todayFacts.readiness === "missing" ? (
            <Text style={styles.missingHint}>No nutrition logged yet for this day.</Text>
          ) : null}

          {totalsSyncing ? (
            <Text
              style={styles.syncingHint}
              accessibilityRole="text"
              accessibilityLiveRegion="polite"
              testID="nutrition-totals-syncing"
            >
              Syncing server totals…
            </Text>
          ) : null}

          <View style={styles.hero} accessibilityLiveRegion="polite">
            <Text style={styles.calorieValue} testID="nutrition-today-calorie-value">
              {model.calorieValueLabel}
            </Text>
            <Text style={styles.calorieGoal}>{model.calorieGoalLabel}</Text>
          </View>

          <View style={styles.rows}>
            {macroRows.map((row) => {
              const macro = row.key as NutritionMacroKey;
              const navigable = onPressMacro != null;
              const a11yLabel = `${row.label}, ${row.amountLabel}${
                row.percentLabel !== "—" ? `, ${row.percentLabel} of goal` : ""
              }${navigable ? ". Opens details." : ""}`;
              return (
                <Pressable
                  key={row.key}
                  onPress={navigable ? () => onPressMacro(macro) : undefined}
                  disabled={!navigable}
                  accessibilityRole={navigable ? "button" : "text"}
                  accessibilityLabel={a11yLabel}
                  style={({ pressed }) => [
                    styles.row,
                    navigable && styles.rowTappable,
                    pressed && navigable && styles.rowPressed,
                  ]}
                  testID={`nutrition-today-macro-${row.key}`}
                >
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>{row.label}</Text>
                    <View style={styles.metricRight}>
                      <Text style={styles.metricValue} numberOfLines={1}>
                        {row.amountLabel}
                      </Text>
                      {row.percentLabel !== "—" ? (
                        <Text style={styles.metricPercent} numberOfLines={1}>
                          {row.percentLabel}
                        </Text>
                      ) : null}
                      {navigable ? (
                        <Text
                          style={styles.chevron}
                          accessibilityElementsHidden
                          importantForAccessibility="no"
                          testID={`nutrition-today-macro-${row.key}-chevron`}
                        >
                          {"\u203A"}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <LinearProgressBar
                    progress={row.progress}
                    trackColor={NUTRITION_PROGRESS_TRACK_BG}
                    fillColor={NUTRITION_ACCENT}
                    height={PROGRESS_H}
                    borderRadius={PROGRESS_R}
                    testID={`nutrition-today-progress-${row.key}`}
                  />
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 15,
    gap: 12,
    ...elevatedCardSurfaceStyle,
  },
  missingHint: {
    fontSize: 14,
    fontWeight: "400",
    color: UI_TEXT_MUTED,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  syncingHint: {
    fontSize: 13,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  hero: { gap: 2 },
  calorieValue: {
    fontSize: 34,
    lineHeight: 40,
    color: UI_TEXT_PRIMARY,
    fontWeight: "700",
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
  },
  calorieGoal: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  rows: {
    gap: 6,
  },
  row: {
    gap: 6,
    paddingVertical: 7,
  },
  rowTappable: {
    borderRadius: 8,
    marginHorizontal: -6,
    paddingHorizontal: 6,
    minHeight: 44,
    justifyContent: "center",
  },
  rowPressed: { opacity: 0.75 },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  metricLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.1,
    flexShrink: 0,
  },
  metricRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  metricValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
    fontVariant: ["tabular-nums"],
    flexShrink: 1,
  },
  metricPercent: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: UI_TEXT_MUTED,
    fontVariant: ["tabular-nums"],
    minWidth: 40,
    textAlign: "right",
    flexShrink: 0,
  },
  chevron: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
    flexShrink: 0,
  },
});
