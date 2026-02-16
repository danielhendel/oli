// components/workout/WorkoutExerciseList.tsx
import React from "react";
import Card from "../../lib/ui/Card";
import { Text } from "../../lib/ui/Text";

export type WorkoutSet = { reps?: number; weight?: number; rpe?: number };
export type WorkoutExercise = { name: string; sets: WorkoutSet[] };

type Props = { exercises: WorkoutExercise[] };

export default function WorkoutExerciseList({ exercises }: Props) {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return (
      <Card variant="elevated" radius="lg" padding="lg">
        <Text tone="muted">No exercises logged.</Text>
      </Card>
    );
  }
  return (
    <>
      {exercises.map((ex, idx) => (
        <Card key={idx} variant="elevated" radius="lg" padding="lg" style={{ gap: 8 }}>
          <Text weight="medium">{ex.name || `Exercise ${idx + 1}`}</Text>
          {Array.isArray(ex.sets) && ex.sets.length > 0 ? (
            ex.sets.map((s, i) => (
              <Text key={i} tone="muted">
                Set {i + 1}
                {typeof s.reps === "number" ? ` — ${s.reps} reps` : ""}
                {typeof s.weight === "number" ? ` @ ${s.weight} kg` : ""}
                {typeof s.rpe === "number" ? ` · RPE ${s.rpe}` : ""}
              </Text>
            ))
          ) : (
            <Text tone="muted">No sets.</Text>
          )}
        </Card>
      ))}
    </>
  );
}
