// app/(app)/program/workout/muscle-group/[muscleGroupId]/exercise-slot/[slotId].tsx
import React, { useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { buildMuscleGroupExercisePlan } from "@/lib/data/program/buildProgramExerciseRecommendations";
import { buildProgrammingPrescriptionFromDraft } from "@/lib/data/program/buildProgrammingPrescription";
import { buildProgramExerciseSwapOptionsArgs, getExerciseSwapOptions } from "@/lib/data/program/getExerciseSwapOptions";
import { getProgramExerciseDetails } from "@/lib/data/program/getProgramExerciseDetails";
import { parseMuscleGroupRouteParam } from "@/lib/data/program/parseMuscleGroupRouteParam";
import { PROGRAM_DESIGN_MUSCLE_GROUP_LABEL } from "@/lib/data/program/workoutProgramDesignOptions";
import {
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";
import { useBuilderStackHeader } from "@/lib/ui/headers/useBuilderStackHeader";
import { ExerciseSlotSelectScreen } from "@/lib/ui/program/ExerciseSlotSelectScreen";

export default function ProgramExerciseSlotSelectRoute() {
  const router = useRouter();
  const { muscleGroupId: rawMuscleGroupId, slotId: rawSlotId } = useLocalSearchParams<{
    muscleGroupId: string;
    slotId: string;
  }>();
  const muscleGroupId = parseMuscleGroupRouteParam(rawMuscleGroupId);
  const slotId = typeof rawSlotId === "string" ? rawSlotId : null;
  useBuilderStackHeader("Select exercise");

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

  const slot = plan?.slots.find((s) => s.slotId === slotId) ?? null;
  const muscleLabel =
    muscleGroupId != null ? PROGRAM_DESIGN_MUSCLE_GROUP_LABEL[muscleGroupId] : "Muscle";

  const options =
    muscleGroupId != null && prescription != null
      ? getExerciseSwapOptions(
          buildProgramExerciseSwapOptionsArgs({
            muscleGroupId,
            trainingType: prescription.inputs.trainingType,
            trainingLevel: prescription.inputs.trainingLevel,
            selectedExerciseId: slot?.selectedExerciseId ?? null,
          }),
        )
      : [];

  const onSelect = useCallback(
    (exerciseId: string) => {
      if (muscleGroupId == null || slotId == null) return;
      workoutProgramDesignStore.setExerciseSelection(muscleGroupId, slotId, exerciseId);
      router.back();
    },
    [muscleGroupId, slotId, router],
  );

  if (plan == null || slot == null) {
    return null;
  }

  return (
    <ExerciseSlotSelectScreen
      muscleLabel={muscleLabel}
      slotPosition={slot.position}
      selectedExerciseId={slot.selectedExerciseId}
      options={options}
      getDetails={(exerciseId) => getProgramExerciseDetails(exerciseId)}
      onSelect={onSelect}
    />
  );
}
