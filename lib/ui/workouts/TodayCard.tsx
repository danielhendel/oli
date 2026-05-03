import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { TodayMetricKey, TodayOverviewModel } from "@/lib/data/workouts/todayOverviewModel";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { LinearProgressBar } from "@/lib/ui/primitives/LinearProgressBar";
import {
  WORKOUT_OVERVIEW_PROGRESS_FILL_ACTIVITY,
  WORKOUT_OVERVIEW_PROGRESS_FILL_CARDIO,
  WORKOUT_OVERVIEW_PROGRESS_FILL_STRENGTH,
  WORKOUT_STRENGTH_PROGRESS_TRACK_BG,
} from "@/lib/ui/workouts/workoutOverviewAnalyticsTheme";

function fillForTodayMetric(key: TodayMetricKey): string {
  switch (key) {
    case "steps":
      return WORKOUT_OVERVIEW_PROGRESS_FILL_ACTIVITY;
    case "workout_min":
      return WORKOUT_OVERVIEW_PROGRESS_FILL_STRENGTH;
    case "estimated_calorie_burn":
      return WORKOUT_OVERVIEW_PROGRESS_FILL_CARDIO;
    default:
      return WORKOUT_OVERVIEW_PROGRESS_FILL_STRENGTH;
  }
}

import { UI_CARD_SURFACE, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";
type TodayCardProps = {
  model: TodayOverviewModel;
  onViewMore?: () => void;
};

export function TodayCard({ model, onViewMore }: TodayCardProps) {
  return (
    <View style={styles.card}>
      <View style={workoutOverviewInCardHeaderStyles.row}>
        <Text style={workoutOverviewInCardHeaderStyles.title}>Today</Text>
        {onViewMore != null ? (
          <Pressable
            onPress={onViewMore}
            accessibilityRole="button"
            accessibilityLabel="View more"
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
      <View style={styles.rows}>
        {model.rows.map((row) => (
          <View key={row.key} style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.label}>{row.label}</Text>
              <Text style={styles.value}>{row.valueLabel}</Text>
            </View>
            <LinearProgressBar
              progress={row.progress}
              trackColor={WORKOUT_STRENGTH_PROGRESS_TRACK_BG}
              fillColor={fillForTodayMetric(row.key)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 16,
    gap: 12,
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
    color: UI_TEXT_PRIMARY,
  },
  value: {
    fontSize: 14,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
});
