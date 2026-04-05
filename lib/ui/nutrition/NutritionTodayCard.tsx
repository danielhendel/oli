import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NutritionTodayCardModel } from "@/lib/data/nutrition/nutritionTodayCardModel";
import type { NutritionTodayFactsUi } from "@/lib/data/nutrition/nutritionOverviewUi";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { LinearProgressBar } from "@/lib/ui/primitives/LinearProgressBar";
import { NUTRITION_ACCENT, NUTRITION_PROGRESS_TRACK_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";

type NutritionTodayCardProps = {
  model: NutritionTodayCardModel;
  todayFacts: NutritionTodayFactsUi;
  onRetryFacts?: () => void;
  onViewMore?: () => void;
};

export function NutritionTodayCard({ model, todayFacts, onRetryFacts, onViewMore }: NutritionTodayCardProps) {
  return (
    <View style={styles.card}>
      <View style={workoutOverviewInCardHeaderStyles.row}>
        <Text style={workoutOverviewInCardHeaderStyles.title}>Today</Text>
        {onViewMore != null ? (
          <Pressable
            onPress={onViewMore}
            accessibilityRole="button"
            accessibilityLabel="View more nutrition analytics"
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
          title="Could not load summary"
          message={todayFacts.message}
          requestId={todayFacts.requestId}
          {...(onRetryFacts != null ? { onRetry: onRetryFacts } : {})}
        />
      ) : (
        <>
          {todayFacts.readiness === "missing" ? (
            <Text style={styles.missingHint}>No daily rollup for today yet — macros will appear after data syncs.</Text>
          ) : null}
          <View style={styles.rows}>
            {model.rows.map((row) => (
              <View key={row.key} style={styles.row}>
                <View style={styles.rowTop}>
                  <Text style={styles.label}>{row.label}</Text>
                  <Text style={styles.value}>{row.valueLabel}</Text>
                </View>
                <LinearProgressBar
                  progress={row.progress}
                  trackColor={NUTRITION_PROGRESS_TRACK_BG}
                  fillColor={NUTRITION_ACCENT}
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
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  missingHint: {
    fontSize: 14,
    fontWeight: "400",
    color: "#8E8E93",
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  rows: {
    gap: 10,
  },
  row: {
    gap: 6,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3C3C43",
  },
  value: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1C1C1E",
  },
});
