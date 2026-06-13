// app/(app)/program/workout/muscle-group/[muscleGroupId]/frequency.tsx
import React, { useCallback } from "react";
import { useLocalSearchParams } from "expo-router";

import { buildProgrammingPrescriptionFromDraft } from "@/lib/data/program/buildProgrammingPrescription";
import { parseMuscleGroupRouteParam } from "@/lib/data/program/parseMuscleGroupRouteParam";
import {
  PROGRAM_DESIGN_MUSCLE_GROUP_LABEL,
  TRAINING_DAYS_MAX,
} from "@/lib/data/program/workoutProgramDesignOptions";
import {
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";
import { useBuilderStackHeader } from "@/lib/ui/headers/useBuilderStackHeader";
import { ProgramMuscleNumberEditScreen } from "@/lib/ui/program/ProgramMuscleNumberEditScreen";

export default function ProgramMuscleFrequencyRoute() {
  const { muscleGroupId: rawMuscleGroupId } = useLocalSearchParams<{ muscleGroupId: string }>();
  const muscleGroupId = parseMuscleGroupRouteParam(rawMuscleGroupId);
  const label = muscleGroupId != null ? PROGRAM_DESIGN_MUSCLE_GROUP_LABEL[muscleGroupId] : "Muscle";
  useBuilderStackHeader("Frequency");

  const draft = useWorkoutProgramDesignDraft();
  const prescription = buildProgrammingPrescriptionFromDraft(draft);
  const muscle = prescription?.muscles.find((m) => m.muscleGroupId === muscleGroupId);
  const maxFreq = prescription?.inputs.trainingDays ?? TRAINING_DAYS_MAX;
  const value =
    muscleGroupId != null && muscleGroupId in draft.frequencyOverrides
      ? draft.frequencyOverrides[muscleGroupId]!
      : (muscle?.frequencyPerWeek ?? 1);

  const onChange = useCallback(
    (next: number) => {
      if (muscleGroupId == null) return;
      workoutProgramDesignStore.setFrequencyOverride(muscleGroupId, next);
    },
    [muscleGroupId],
  );

  return (
    <ProgramMuscleNumberEditScreen
      title="Frequency"
      description={`How many times per week ${label} is trained.`}
      value={value}
      min={1}
      max={maxFreq}
      unitLabel="× per week"
      onChange={onChange}
      testID="muscle-edit-frequency"
    />
  );
}
