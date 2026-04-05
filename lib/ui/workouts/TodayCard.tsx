import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { TodayOverviewModel } from "@/lib/data/workouts/todayOverviewModel";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { LinearProgressBar } from "@/lib/ui/primitives/LinearProgressBar";
import {
  WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL,
  WORKOUT_STRENGTH_PROGRESS_TRACK_BG,
} from "@/lib/ui/workouts/workoutOverviewAnalyticsTheme";

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
              fillColor={WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL}
            />
          </View>
        ))}
      </View>
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
