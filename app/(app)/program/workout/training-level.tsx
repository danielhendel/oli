// app/(app)/program/workout/training-level.tsx
// Oli — Program Design: Training Level. Route composition only.
import React, { useCallback } from "react";
import { useRouter } from "expo-router";

import { PROGRAM_DESIGN_TRAINING_LEVEL_OPTIONS } from "@/lib/data/program/workoutProgramDesignOptions";
import type { ProgramDesignTrainingLevel } from "@/lib/data/program/workoutProgramDesignTypes";
import {
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";
import { ProgramDesignOptionScreen } from "@/lib/ui/program/ProgramDesignOptionScreen";

export default function ProgramDesignTrainingLevelRoute() {
  const router = useRouter();
  const draft = useWorkoutProgramDesignDraft();

  const onSelect = useCallback(
    (id: ProgramDesignTrainingLevel) => {
      workoutProgramDesignStore.setTrainingLevel(id);
      router.back();
    },
    [router],
  );

  return (
    <ProgramDesignOptionScreen<ProgramDesignTrainingLevel>
      description="Pick the experience level this program targets."
      options={PROGRAM_DESIGN_TRAINING_LEVEL_OPTIONS}
      selectedId={draft.trainingLevel}
      onSelect={onSelect}
      testIDPrefix="program-training-level"
      accessibilityLabel="Training Level"
    />
  );
}
