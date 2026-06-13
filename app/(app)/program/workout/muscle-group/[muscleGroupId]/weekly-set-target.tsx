// app/(app)/program/workout/muscle-group/[muscleGroupId]/weekly-set-target.tsx
import React, { useCallback } from "react";
import { useLocalSearchParams } from "expo-router";

import { buildProgrammingPrescriptionFromDraft } from "@/lib/data/program/buildProgrammingPrescription";
import { parseMuscleGroupRouteParam } from "@/lib/data/program/parseMuscleGroupRouteParam";
import {
  MUSCLE_VOLUME_MAX_SETS,
  MUSCLE_VOLUME_MIN_SETS,
  PROGRAM_DESIGN_MUSCLE_GROUP_LABEL,
} from "@/lib/data/program/workoutProgramDesignOptions";
import {
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";
import { useBuilderStackHeader } from "@/lib/ui/headers/useBuilderStackHeader";
import { ProgramMuscleNumberEditScreen } from "@/lib/ui/program/ProgramMuscleNumberEditScreen";

export default function ProgramMuscleWeeklySetTargetRoute() {
  const { muscleGroupId: rawMuscleGroupId } = useLocalSearchParams<{ muscleGroupId: string }>();
  const muscleGroupId = parseMuscleGroupRouteParam(rawMuscleGroupId);
  const label = muscleGroupId != null ? PROGRAM_DESIGN_MUSCLE_GROUP_LABEL[muscleGroupId] : "Muscle";
  useBuilderStackHeader("Weekly set target");

  const draft = useWorkoutProgramDesignDraft();
  const prescription = buildProgrammingPrescriptionFromDraft(draft);
  const muscle = prescription?.muscles.find((m) => m.muscleGroupId === muscleGroupId);
  const value =
    muscleGroupId != null && muscleGroupId in draft.muscleVolumeOverrides
      ? draft.muscleVolumeOverrides[muscleGroupId]!
      : (muscle?.weeklySets ?? 0);

  const onChange = useCallback(
    (next: number) => {
      if (muscleGroupId == null) return;
      workoutProgramDesignStore.setMuscleVolumeOverride(muscleGroupId, next);
    },
    [muscleGroupId],
  );

  return (
    <ProgramMuscleNumberEditScreen
      title="Weekly set target"
      description={`How many working sets per week for ${label}.`}
      value={value}
      min={MUSCLE_VOLUME_MIN_SETS}
      max={MUSCLE_VOLUME_MAX_SETS}
      unitLabel="sets"
      onChange={onChange}
      testID="muscle-edit-weekly-set-target"
    />
  );
}
