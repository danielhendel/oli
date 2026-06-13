// app/(app)/program/workout/training-type.tsx
// Oli — Program Design: Training Type. Route composition only.
import React, { useCallback } from "react";
import { useRouter } from "expo-router";

import { TRAINING_TYPE_OPTIONS } from "@/lib/data/program/workoutProgramDesignOptions";
import type { TrainingType } from "@/lib/data/program/workoutProgramDesignTypes";
import {
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";
import { ProgramDesignOptionScreen } from "@/lib/ui/program/ProgramDesignOptionScreen";

export default function ProgramDesignTrainingTypeRoute() {
  const router = useRouter();
  const draft = useWorkoutProgramDesignDraft();

  const onSelect = useCallback(
    (id: TrainingType) => {
      workoutProgramDesignStore.setTrainingType(id);
      router.back();
    },
    [router],
  );

  return (
    <ProgramDesignOptionScreen<TrainingType>
      description="Choose the training style the engine optimizes for."
      options={TRAINING_TYPE_OPTIONS}
      selectedId={draft.trainingType}
      onSelect={onSelect}
      testIDPrefix="program-training-type"
      accessibilityLabel="Training Type"
    />
  );
}
