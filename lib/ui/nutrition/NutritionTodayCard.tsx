import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NutritionTodayCardModel } from "@/lib/data/nutrition/nutritionTodayCardModel";
import type { NutritionTodayFactsUi } from "@/lib/data/nutrition/nutritionOverviewUi";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { LinearProgressBar } from "@/lib/ui/primitives/LinearProgressBar";
import { NUTRITION_ACCENT, NUTRITION_PROGRESS_TRACK_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { friendlyNutritionOverviewErrorMessage } from "@/lib/ui/nutrition/nutritionOverviewErrors";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";

import { UI_CARD_SURFACE } from "@/lib/ui/theme/uiTokens";
const PROGRESS_H = 6;
const PROGRESS_R = 4;

type NutritionTodayCardProps = {
  model: NutritionTodayCardModel;
  todayFacts: NutritionTodayFactsUi;
  /** Main heading — usually "Today" when the strip selection matches the calendar anchor day. */
  headingTitle?: string;
  onRetryFacts?: () => void;
  onViewMore?: () => void;
};

export function NutritionTodayCard({
  model,
  todayFacts,
  headingTitle = "Today",
  onRetryFacts,
  onViewMore,
}: NutritionTodayCardProps) {
  return (
    <View style={styles.card}>
      <View style={workoutOverviewInCardHeaderStyles.row}>
        <Text style={workoutOverviewInCardHeaderStyles.title}>{headingTitle}</Text>
        {onViewMore != null ? (
          <Pressable
            onPress={onViewMore}
            accessibilityRole="button"
            accessibilityLabel="View more for this day"
            hitSlop={8}
            style={({ pressed }) => [
              workoutOverviewInCardHeaderStyles.linkHit,
              pressed && workoutOverviewInCardHeaderStyles.linkPressed,
            ]}
          >
            <Text style={workoutOverviewInCardHeaderStyles.link}>View More</Text>
          </Pressable>
        ) : null}
      </View>
      {todayFacts.isLoading ? (
        <LoadingState message="Loading today's summary…" variant="inline" />
      ) : todayFacts.readiness === "error" ? (
        <ErrorState
          variant="inline"
          title="Could not load today’s summary"
          message={friendlyNutritionOverviewErrorMessage(todayFacts.message)}
          requestId={todayFacts.requestId}
          {...(onRetryFacts != null ? { onRetry: onRetryFacts } : {})}
        />
      ) : (
        <>
          {todayFacts.readiness === "missing" ? (
            <Text style={styles.missingHint}>
              No macros logged for this day yet — log a meal to see progress here.
            </Text>
          ) : null}
          <View style={styles.rows}>
            {model.rows.map((row) => (
              <View key={row.key} style={styles.row}>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>{row.label}</Text>
                  <Text style={styles.metricValue}>{row.valueLabel}</Text>
                </View>
                <LinearProgressBar
                  progress={row.progress}
                  trackColor={NUTRITION_PROGRESS_TRACK_BG}
                  fillColor={NUTRITION_ACCENT}
                  height={PROGRESS_H}
                  borderRadius={PROGRESS_R}
                  testID={`nutrition-today-progress-${row.key}`}
                />
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 15,
    gap: 11,
    ...elevatedCardSurfaceStyle,
  },
  missingHint: {
    fontSize: 14,
    fontWeight: "400",
    color: "#8E8E93",
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  rows: {
    gap: 12,
  },
  row: {
    gap: 5,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
    paddingTop: 1,
  },
  metricLabel: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "500",
    color: "#8E8E93",
    letterSpacing: -0.08,
  },
  metricValue: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.28,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
    flexShrink: 1,
  },
});
