import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { WeeklyStrengthCardModel } from "@/lib/data/workouts/weeklyStrengthCardModel";
import { kgToLbs } from "@/lib/metrics/metricUnits";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { LinearProgressBar } from "@/lib/ui/primitives/LinearProgressBar";
import {
  WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL,
  WORKOUT_STRENGTH_PROGRESS_TRACK_BG,
} from "@/lib/ui/workouts/workoutOverviewAnalyticsTheme";

import {
  UI_CARD_SURFACE,
  UI_SCREEN_BG,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
type WeeklyStrengthCardProps = {
  model: WeeklyStrengthCardModel;
};

function formatVolumeLabelKgAsLb(kg: number): string {
  const lb = kgToLbs(kg);
  if (!Number.isFinite(lb) || lb <= 0) return "0 lb";
  return `${Math.round(lb).toLocaleString()} lb`;
}

export function WeeklyStrengthCard({ model }: WeeklyStrengthCardProps) {
  const workoutMax = useMemo(
    () => Math.max(1, ...model.workouts.map((row) => row.totalVolume)),
    [model.workouts],
  );

  return (
    <View style={styles.card}>
      <Text style={styles.headerKicker}>Weekly Strength</Text>
      <View style={[workoutOverviewInCardHeaderStyles.row, styles.metricRow]}>
        <View style={styles.metricTile}>
          <Text style={styles.metricLabel}>Total Workouts</Text>
          <Text style={styles.metricValue}>{model.totalWorkouts.toLocaleString()}</Text>
        </View>
        <View style={styles.metricTile}>
          <Text style={styles.metricLabel}>Total Volume</Text>
          <Text style={styles.metricValue}>{formatVolumeLabelKgAsLb(model.totalVolume)}</Text>
        </View>
      </View>

      <View style={styles.rowsBlock}>
        {model.workouts.length === 0 ? (
          <Text style={styles.placeholder}>No strength workouts this week yet.</Text>
        ) : (
          model.workouts.map((row) => {
            return (
              <View key={row.workoutId} style={styles.row}>
                <View style={styles.rowTop}>
                  <Text numberOfLines={1} style={styles.rowLabel}>
                    {row.workoutName}
                  </Text>
                  <Text style={styles.rowValue}>{formatVolumeLabelKgAsLb(row.totalVolume)}</Text>
                </View>
                <LinearProgressBar
                  progress={row.totalVolume / workoutMax}
                  trackColor={WORKOUT_STRENGTH_PROGRESS_TRACK_BG}
                  fillColor={WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL}
                />
              </View>
            );
          })
        )}
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
  headerKicker: {
    fontSize: 20,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  metricRow: {
    gap: 10,
  },
  metricTile: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: UI_SCREEN_BG,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: UI_TEXT_TERTIARY_LABEL,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  rowsBlock: {
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
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  placeholder: {
    fontSize: 14,
    color: UI_TEXT_SECONDARY,
    paddingVertical: 2,
  },
});
