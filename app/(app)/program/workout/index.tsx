// app/(app)/program/workout/index.tsx
// Oli — Workout Builder landing. Route composition only: read the client-side Program Design
// draft, derive row view-models + the generated prescription via pure selectors, and render UI.
// No business logic here.
import React, { useCallback } from "react";
import { type Href, useRouter } from "expo-router";

import { useBuilderStackHeader } from "@/lib/ui/headers/useBuilderStackHeader";

import { buildProgramDesignRows } from "@/lib/data/program/buildWorkoutProgramDesignSummary";
import {
  buildProgrammingPrescriptionFromDraft,
  missingProgrammingInputTitles,
} from "@/lib/data/program/buildProgrammingPrescription";
import {
  PROGRAM_DESIGN_MUSCLE_VOLUME_ROUTE,
  PROGRAM_DESIGN_WEEKLY_SPLIT_ROUTE,
  programDayWorkoutRoute,
  programMuscleGroupExercisesRoute,
} from "@/lib/data/program/workoutProgramDesignOptions";
import type {
  ProgramDesignMuscleGroup,
  ProgramDesignRowModel,
} from "@/lib/data/program/workoutProgramDesignTypes";
import { useWorkoutProgramDesignDraft } from "@/lib/data/program/workoutProgramDesignStore";
import { WorkoutProgramDesignScreen } from "@/lib/ui/program/WorkoutProgramDesignScreen";

export default function WorkoutBuilderRoute() {
  useBuilderStackHeader("Workout Builder");
  const router = useRouter();
  const draft = useWorkoutProgramDesignDraft();
  const rows = buildProgramDesignRows(draft);
  const prescription = buildProgrammingPrescriptionFromDraft(draft);
  const missingTitles = missingProgrammingInputTitles(draft);

  const onSelectCategory = useCallback(
    (row: ProgramDesignRowModel) => {
      router.push(row.href as Href);
    },
    [router],
  );

  const onOpenMuscleVolume = useCallback(() => {
    router.push(PROGRAM_DESIGN_MUSCLE_VOLUME_ROUTE as Href);
  }, [router]);

  const onOpenWeeklySplit = useCallback(() => {
    router.push(PROGRAM_DESIGN_WEEKLY_SPLIT_ROUTE as Href);
  }, [router]);

  const onOpenMuscleExercises = useCallback(
    (muscleGroupId: ProgramDesignMuscleGroup) => {
      router.push(programMuscleGroupExercisesRoute(muscleGroupId) as Href);
    },
    [router],
  );

  const onOpenDay = useCallback(
    (dayId: string) => {
      router.push(programDayWorkoutRoute(dayId) as Href);
    },
    [router],
  );

  return (
    <WorkoutProgramDesignScreen
      rows={rows}
      onSelectCategory={onSelectCategory}
      prescription={prescription}
      missingTitles={missingTitles}
      onOpenMuscleVolume={onOpenMuscleVolume}
      onOpenWeeklySplit={onOpenWeeklySplit}
      onOpenMuscleExercises={onOpenMuscleExercises}
      onOpenDay={onOpenDay}
      muscleExerciseContext={{
        exerciseCountOverrides: draft.exerciseCountOverrides,
        exerciseSelectionOverrides: draft.exerciseSelectionOverrides,
        trainingDayOverrides: draft.trainingDayOverrides,
        slotDayOverrides: draft.slotDayOverrides,
      }}
    />
  );
}
