// app/(app)/program/workout/muscle-group/[muscleGroupId]/exercise-count.tsx
import React, { useCallback } from "react";
import { useLocalSearchParams } from "expo-router";

import { buildMuscleGroupExercisePlan } from "@/lib/data/program/buildProgramExerciseRecommendations";
import { buildProgrammingPrescriptionFromDraft } from "@/lib/data/program/buildProgrammingPrescription";
import {
  EXERCISE_COUNT_MAX,
  EXERCISE_COUNT_MIN,
} from "@/lib/data/program/programExerciseRecommendationTypes";
import { parseMuscleGroupRouteParam } from "@/lib/data/program/parseMuscleGroupRouteParam";
import { PROGRAM_DESIGN_MUSCLE_GROUP_LABEL } from "@/lib/data/program/workoutProgramDesignOptions";
import {
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";
import { useBuilderStackHeader } from "@/lib/ui/headers/useBuilderStackHeader";
import { ProgramMuscleNumberEditScreen } from "@/lib/ui/program/ProgramMuscleNumberEditScreen";

export default function ProgramMuscleExerciseCountRoute() {
  const { muscleGroupId: rawMuscleGroupId } = useLocalSearchParams<{ muscleGroupId: string }>();
  const muscleGroupId = parseMuscleGroupRouteParam(rawMuscleGroupId);
  const label = muscleGroupId != null ? PROGRAM_DESIGN_MUSCLE_GROUP_LABEL[muscleGroupId] : "Muscle";
  useBuilderStackHeader("Number of exercises");

  const draft = useWorkoutProgramDesignDraft();
  const prescription = buildProgrammingPrescriptionFromDraft(draft);
  const plan =
    prescription != null && muscleGroupId != null
      ? buildMuscleGroupExercisePlan({
          prescription,
          muscleGroupId,
          exerciseCountOverride: draft.exerciseCountOverrides[muscleGroupId],
          trainingDayOverride: draft.trainingDayOverrides[muscleGroupId],
          selections: draft.exerciseSelectionOverrides,
        })
      : null;

  const onChange = useCallback(
    (next: number) => {
      if (muscleGroupId == null) return;
      workoutProgramDesignStore.setExerciseCountOverride(muscleGroupId, next);
    },
    [muscleGroupId],
  );

  return (
    <ProgramMuscleNumberEditScreen
      title="Number of exercises"
      description={`How many exercise slots for ${label}. Each slot gets a share of your weekly sets.`}
      value={plan?.settings.exerciseCount ?? 0}
      min={EXERCISE_COUNT_MIN}
      max={EXERCISE_COUNT_MAX}
      onChange={onChange}
      testID="muscle-edit-exercise-count"
    />
  );
}
