// app/(app)/program/workout/muscle-group/[muscleGroupId]/index.tsx
import React, { useCallback } from "react";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";

import { assignExerciseSlotsToTrainingDays } from "@/lib/data/program/assignExerciseSlotsToTrainingDays";
import { buildMuscleGroupExercisePlan } from "@/lib/data/program/buildProgramExerciseRecommendations";
import {
  buildProgrammingPrescriptionFromDraft,
  missingProgrammingInputTitles,
} from "@/lib/data/program/buildProgrammingPrescription";
import { parseMuscleGroupRouteParam } from "@/lib/data/program/parseMuscleGroupRouteParam";
import {
  PROGRAM_DESIGN_MUSCLE_GROUP_LABEL,
  programExerciseSlotRoute,
  programMuscleGroupMetricRoute,
  type ProgramMuscleMetric,
} from "@/lib/data/program/workoutProgramDesignOptions";
import { useWorkoutProgramDesignDraft } from "@/lib/data/program/workoutProgramDesignStore";
import { useBuilderStackHeader } from "@/lib/ui/headers/useBuilderStackHeader";
import { MuscleGroupExercisesSetupScreen } from "@/lib/ui/program/MuscleGroupExercisesSetupScreen";

export default function ProgramMuscleGroupExercisesRoute() {
  const router = useRouter();
  const { muscleGroupId: rawMuscleGroupId } = useLocalSearchParams<{ muscleGroupId: string }>();
  const muscleGroupId = parseMuscleGroupRouteParam(rawMuscleGroupId);

  const title =
    muscleGroupId != null ? PROGRAM_DESIGN_MUSCLE_GROUP_LABEL[muscleGroupId] : "Exercises";
  useBuilderStackHeader(title);

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
          dayAssignment: assignExerciseSlotsToTrainingDays({
            prescription,
            exerciseCountOverrides: draft.exerciseCountOverrides,
            trainingDayOverrides: draft.trainingDayOverrides,
            slotDayOverrides: draft.slotDayOverrides,
          }),
        })
      : null;

  const onEditMetric = useCallback(
    (metric: ProgramMuscleMetric) => {
      if (muscleGroupId == null) return;
      router.push(programMuscleGroupMetricRoute(muscleGroupId, metric) as Href);
    },
    [router, muscleGroupId],
  );

  const onSelectSlot = useCallback(
    (slotId: string) => {
      if (muscleGroupId == null) return;
      router.push(programExerciseSlotRoute(muscleGroupId, slotId) as Href);
    },
    [router, muscleGroupId],
  );

  const missingHint = `Set ${missingProgrammingInputTitles(draft).join(", ")} on the Program Design screen to generate your program structure.`;

  return (
    <MuscleGroupExercisesSetupScreen
      available={prescription != null && muscleGroupId != null}
      plan={plan}
      missingHint={missingHint}
      onEditMetric={onEditMetric}
      onSelectSlot={onSelectSlot}
    />
  );
}
