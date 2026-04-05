import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MuscleGroup } from "@/lib/workouts/exercises/taxonomy";
import type { WeeklyStrengthCardModel } from "@/lib/data/workouts/weeklyStrengthCardModel";
import { kgToLbs } from "@/lib/metrics/metricUnits";
import { LinearProgressBar } from "@/lib/ui/primitives/LinearProgressBar";
import {
  overviewAccentForTab,
  WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL,
  WORKOUT_STRENGTH_PROGRESS_TRACK_BG,
} from "@/lib/ui/workouts/workoutOverviewAnalyticsTheme";

type MuscleTab = "volume" | "sets";

type WeeklyMuscleGroupCardProps = {
  model: WeeklyStrengthCardModel;
  /** First mount only; optional deep-link hint from Strength Analytics focus. */
  initialTab?: MuscleTab;
};

const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  triceps: "Triceps",
  biceps: "Biceps",
  forearms: "Forearms",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
};

function formatVolumeLabelKgAsLb(kg: number): string {
  const lb = kgToLbs(kg);
  if (!Number.isFinite(lb) || lb <= 0) return "0 lb";
  return `${Math.round(lb).toLocaleString()} lb`;
}

function formatSetCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  return Math.round(n).toLocaleString();
}

export function WeeklyMuscleGroupCard({ model, initialTab }: WeeklyMuscleGroupCardProps) {
  const [tab, setTab] = useState<MuscleTab>(initialTab ?? "volume");
  const accent = useMemo(() => overviewAccentForTab("strength"), []);

  const volumeMax = useMemo(
    () => Math.max(1, ...model.muscleGroups.map((row) => row.totalVolume)),
    [model.muscleGroups],
  );

  const setsMax = useMemo(
    () => Math.max(1, ...model.muscleGroupsSets.map((row) => row.totalSets)),
    [model.muscleGroupsSets],
  );

  const placeholder =
    tab === "volume"
      ? "No mappable muscle-group volume this week yet."
      : "No mappable muscle-group sets this week yet.";

  return (
    <View style={styles.card}>
      <Text style={styles.headerKicker}>Weekly Muscle Group</Text>
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setTab("volume")}
          style={({ pressed }) => [
            styles.tab,
            tab === "volume" && styles.tabActive,
            pressed && styles.tabPressed,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "volume" }}
          accessibilityLabel="Muscle group volume tab"
        >
          <Text
            style={[
              styles.tabText,
              tab === "volume" && [styles.tabTextActive, { color: accent.tabTextActive }],
            ]}
          >
            Volume
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("sets")}
          style={({ pressed }) => [
            styles.tab,
            tab === "sets" && styles.tabActive,
            pressed && styles.tabPressed,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "sets" }}
          accessibilityLabel="Muscle group sets tab"
        >
          <Text
            style={[
              styles.tabText,
              tab === "sets" && [styles.tabTextActive, { color: accent.tabTextActive }],
            ]}
          >
            Sets
          </Text>
        </Pressable>
      </View>
      <View style={styles.rowsBlock}>
        {tab === "volume" ? (
          model.muscleGroups.length === 0 ? (
            <Text style={styles.placeholder}>{placeholder}</Text>
          ) : (
            model.muscleGroups.map((row) => {
              return (
                <View key={row.muscleGroup} style={styles.row}>
                  <View style={styles.rowTop}>
                    <Text numberOfLines={1} style={styles.rowLabel}>
                      {MUSCLE_GROUP_LABELS[row.muscleGroup]}
                    </Text>
                    <Text style={styles.rowValue}>{formatVolumeLabelKgAsLb(row.totalVolume)}</Text>
                  </View>
                  <LinearProgressBar
                    progress={row.totalVolume / volumeMax}
                    trackColor={WORKOUT_STRENGTH_PROGRESS_TRACK_BG}
                    fillColor={WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL}
                  />
                </View>
              );
            })
          )
        ) : model.muscleGroupsSets.length === 0 ? (
          <Text style={styles.placeholder}>{placeholder}</Text>
        ) : (
          model.muscleGroupsSets.map((row) => {
            return (
              <View key={row.muscleGroup} style={styles.row}>
                <View style={styles.rowTop}>
                  <Text numberOfLines={1} style={styles.rowLabel}>
                    {MUSCLE_GROUP_LABELS[row.muscleGroup]}
                  </Text>
                  <Text style={styles.rowValue}>{formatSetCount(row.totalSets)}</Text>
                </View>
                <LinearProgressBar
                  progress={row.totalSets / setsMax}
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
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  headerKicker: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.3,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#EBEBEF",
    borderRadius: 10,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.1)",
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabPressed: { opacity: 0.78 },
  tabText: { fontSize: 15, fontWeight: "500", color: "#8E8E93" },
  tabTextActive: { fontWeight: "700" },
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
    color: "#1C1C1E",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3C3C43",
  },
  placeholder: {
    fontSize: 14,
    color: "#8E8E93",
    paddingVertical: 2,
  },
});
