// app/(app)/program/workout/muscle-group/[muscleGroupId]/training-days.tsx
import React, { useCallback } from "react";
import { useLocalSearchParams } from "expo-router";

import { buildMuscleGroupExercisePlan } from "@/lib/data/program/buildProgramExerciseRecommendations";
import { buildProgrammingPrescriptionFromDraft } from "@/lib/data/program/buildProgrammingPrescription";
import { parseMuscleGroupRouteParam } from "@/lib/data/program/parseMuscleGroupRouteParam";
import { PROGRAM_DESIGN_MUSCLE_GROUP_LABEL } from "@/lib/data/program/workoutProgramDesignOptions";
import {
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";
import { useBuilderStackHeader } from "@/lib/ui/headers/useBuilderStackHeader";
import { ProgramMuscleTrainingDaysScreen } from "@/lib/ui/program/ProgramMuscleTrainingDaysScreen";

export default function ProgramMuscleTrainingDaysRoute() {
  const { muscleGroupId: rawMuscleGroupId } = useLocalSearchParams<{ muscleGroupId: string }>();
  const muscleGroupId = parseMuscleGroupRouteParam(rawMuscleGroupId);
  const label = muscleGroupId != null ? PROGRAM_DESIGN_MUSCLE_GROUP_LABEL[muscleGroupId] : "Muscle";
  useBuilderStackHeader("Training days");

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

  const selectedDayIds =
    muscleGroupId != null && draft.trainingDayOverrides[muscleGroupId] != null
      ? draft.trainingDayOverrides[muscleGroupId]!
      : (plan?.settings.trainingDayIds ?? []);

  const onToggleDay = useCallback(
    (dayId: string) => {
      if (muscleGroupId == null || plan == null) return;
      const max = plan.settings.frequencyPerWeek;
      const current = new Set(selectedDayIds);
      if (current.has(dayId)) {
        current.delete(dayId);
      } else if (current.size < max) {
        current.add(dayId);
      } else {
        return;
      }
      workoutProgramDesignStore.setTrainingDayOverride(muscleGroupId, [...current]);
    },
    [muscleGroupId, plan, selectedDayIds],
  );

  return (
    <ProgramMuscleTrainingDaysScreen
      muscleLabel={label}
      maxSelections={plan?.settings.frequencyPerWeek ?? 1}
      days={prescription?.weeklySplit.days ?? []}
      selectedDayIds={selectedDayIds}
      onToggleDay={onToggleDay}
    />
  );
}
