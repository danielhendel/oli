// lib/ui/program/WorkoutExercisePreviewCard.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { WorkoutExercisePrescription } from "@/lib/data/program/workoutBuilderTypes";
import { ProgramSectionCard } from "@/lib/ui/program/ProgramSectionCard";
import {
  UI_BORDER_HAIRLINE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

function formatRest(restSeconds: number): string {
  const m = Math.floor(restSeconds / 60);
  const s = restSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Stat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ExerciseRow({
  exercise,
  isLast,
}: {
  exercise: WorkoutExercisePrescription;
  isLast: boolean;
}): React.ReactElement {
  return (
    <View
      style={[styles.row, isLast && styles.rowLast]}
      accessibilityLabel={`${exercise.name}. ${exercise.sets} sets of ${exercise.reps} reps, tempo ${exercise.tempo}, rest ${formatRest(
        exercise.restSeconds,
      )}, ${exercise.rir} RIR${exercise.loadTarget ? `, ${exercise.loadTarget}` : ""}`}
    >
      <View style={styles.nameRow}>
        <Text style={styles.name} numberOfLines={1}>
          {exercise.name}
        </Text>
        {exercise.loadTarget ? <Text style={styles.load}>{exercise.loadTarget}</Text> : null}
      </View>
      <View style={styles.stats}>
        <Stat label="sets" value={String(exercise.sets)} />
        <Stat label="reps" value={exercise.reps} />
        <Stat label="tempo" value={exercise.tempo} />
        <Stat label="rest" value={formatRest(exercise.restSeconds)} />
        <Stat label="RIR" value={String(exercise.rir)} />
      </View>
    </View>
  );
}

export function WorkoutExercisePreviewCard({
  exercises,
}: {
  exercises: WorkoutExercisePrescription[];
}): React.ReactElement {
  return (
    <ProgramSectionCard
      title="Exercise Prescription Preview"
      subtitle="Example prescriptions from this program."
      testID="workout-exercise-preview-card"
    >
      <View style={styles.list}>
        {exercises.map((exercise, index) => (
          <ExerciseRow
            key={exercise.id}
            exercise={exercise}
            isLast={index === exercises.length - 1}
          />
        ))}
      </View>
    </ProgramSectionCard>
  );
}

const styles = StyleSheet.create({
  list: {},
  row: {
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI_BORDER_HAIRLINE,
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  load: {
    fontSize: 12,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stat: {
    alignItems: "flex-start",
    gap: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 11,
    color: UI_TEXT_MUTED,
  },
});
