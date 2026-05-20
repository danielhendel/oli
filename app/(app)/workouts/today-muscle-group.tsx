import React, { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";

import type { WorkoutDetailMuscleExerciseSetCountRow } from "@/lib/data/workouts/workoutDetailMuscleVolume";
import {
  WORKOUT_DETAIL_MUSCLE_GROUP_LABELS,
} from "@/lib/data/workouts/workoutDetailMuscleVolume";
import { formatCompletedSetsLabel } from "@/lib/data/workouts/workoutDisplay";
import { WORKOUTS_SCREEN_CONTENT_BG } from "@/lib/ui/headers/workoutsStackHeader";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import {
  UI_BORDER_HAIRLINE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import type { MuscleGroup } from "@/lib/workouts/exercises/taxonomy";

const MUSCLE_GROUPS = Object.keys(WORKOUT_DETAIL_MUSCLE_GROUP_LABELS) as MuscleGroup[];

function parseMuscleGroup(value: string | string[] | undefined): MuscleGroup | null {
  const v = typeof value === "string" ? value : Array.isArray(value) ? value[0] : null;
  if (v == null) return null;
  return MUSCLE_GROUPS.includes(v as MuscleGroup) ? (v as MuscleGroup) : null;
}

function parseTotalSets(value: string | string[] | undefined): number | null {
  const v = typeof value === "string" ? value : Array.isArray(value) ? value[0] : null;
  if (v == null) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseExercises(value: string | string[] | undefined): readonly WorkoutDetailMuscleExerciseSetCountRow[] {
  const v = typeof value === "string" ? value : Array.isArray(value) ? value[0] : null;
  if (v == null || v.length === 0) return [];
  try {
    const parsed: unknown = JSON.parse(v);
    if (!Array.isArray(parsed)) return [];
    const rows: WorkoutDetailMuscleExerciseSetCountRow[] = [];
    for (const entry of parsed) {
      if (entry == null || typeof entry !== "object") continue;
      const obj = entry as Record<string, unknown>;
      const name = typeof obj.exerciseName === "string" ? obj.exerciseName.trim() : "";
      const rawCount = obj.setCount;
      const setCount = typeof rawCount === "number" && Number.isFinite(rawCount) && rawCount > 0 ? Math.floor(rawCount) : 0;
      if (name.length === 0 || setCount <= 0) continue;
      rows.push({ exerciseName: name, setCount });
    }
    return rows;
  } catch {
    return [];
  }
}

export const STRENGTH_TODAY_MUSCLE_GROUP_PATHNAME =
  "/(app)/workouts/today-muscle-group" as const;

export type StrengthTodayMuscleGroupRouteParams = {
  muscleGroup: MuscleGroup;
  totalSets: string;
  exercises: string;
};

/** Build route params for `router.push(...)` from a Today card row selection. */
export function buildStrengthTodayMuscleGroupRouteParams(input: {
  muscleGroup: MuscleGroup;
  totalSetCount: number;
  exercises: readonly WorkoutDetailMuscleExerciseSetCountRow[];
}): StrengthTodayMuscleGroupRouteParams {
  return {
    muscleGroup: input.muscleGroup,
    totalSets: String(input.totalSetCount),
    exercises: JSON.stringify(
      input.exercises.map((row) => ({ exerciseName: row.exerciseName, setCount: row.setCount })),
    ),
  };
}

export default function StrengthTodayMuscleGroupSheet(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{
    muscleGroup?: string | string[];
    totalSets?: string | string[];
    exercises?: string | string[];
  }>();
  const muscleGroup = parseMuscleGroup(params.muscleGroup);
  const totalSets = parseTotalSets(params.totalSets);
  const exercises = useMemo(() => parseExercises(params.exercises), [params.exercises]);

  const label = muscleGroup != null ? WORKOUT_DETAIL_MUSCLE_GROUP_LABELS[muscleGroup] : "";
  const navigation = useNavigation();
  useEffect(() => {
    if (label.length > 0) navigation.setOptions({ title: label });
  }, [navigation, label]);

  useEffect(() => {
    if (muscleGroup == null || totalSets == null) router.back();
  }, [muscleGroup, totalSets, router]);

  if (muscleGroup == null || totalSets == null) {
    return <View testID="strength-today-muscle-group-empty" />;
  }

  const totalSetsLine = `${totalSets} working ${totalSets === 1 ? "set" : "sets"}`;
  const a11y = [label, totalSetsLine, ...exercises.map((row) => `${row.exerciseName}, ${formatCompletedSetsLabel(row.setCount)}`)].join(". ");

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      testID="strength-today-muscle-group-scroll"
      accessibilityRole="summary"
      accessibilityLabel={a11y}
    >
      <View style={styles.headerBlock} testID="strength-today-muscle-group-header">
        <Text style={styles.muscleTitle} accessibilityRole="header">
          {label}
        </Text>
        <Text style={styles.totalSetsLine}>{totalSetsLine}</Text>
      </View>

      <View style={styles.rowsWrap} accessibilityRole="list">
        {exercises.map((row, index) => (
          <View
            key={`${row.exerciseName}-${index}`}
            style={[styles.exerciseRow, index === 0 ? null : styles.exerciseRowDivider]}
            testID={`strength-today-muscle-group-exercise-${index}`}
          >
            <Text style={[dashMetricRowLabelTextStyle, styles.exerciseName]} numberOfLines={2}>
              {row.exerciseName}
            </Text>
            <Text
              style={dashMetricRowValueTextStyle}
              numberOfLines={1}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {formatCompletedSetsLabel(row.setCount)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 16,
  },
  headerBlock: {
    gap: 4,
  },
  muscleTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.4,
  },
  totalSetsLine: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.2,
  },
  rowsWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
  },
  exerciseRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
  },
  exerciseName: {
    flex: 1,
    minWidth: 0,
  },
});
