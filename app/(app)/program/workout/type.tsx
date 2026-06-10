// app/(app)/program/workout/type.tsx
// Oli — Program Design: Type. Route composition only.
import React, { useCallback } from "react";
import { useRouter } from "expo-router";

import { WORKOUT_PROGRAM_TYPE_OPTIONS } from "@/lib/data/program/workoutProgramDesignOptions";
import type { WorkoutProgramType } from "@/lib/data/program/workoutProgramDesignTypes";
import {
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";
import { ProgramDesignOptionScreen } from "@/lib/ui/program/ProgramDesignOptionScreen";

export default function ProgramDesignTypeRoute() {
  const router = useRouter();
  const draft = useWorkoutProgramDesignDraft();

  const onSelect = useCallback(
    (id: WorkoutProgramType) => {
      workoutProgramDesignStore.setType(id);
      router.back();
    },
    [router],
  );

  return (
    <ProgramDesignOptionScreen<WorkoutProgramType>
      description="Choose the training style for your program."
      options={WORKOUT_PROGRAM_TYPE_OPTIONS}
      selectedId={draft.type}
      onSelect={onSelect}
      testIDPrefix="program-type"
      accessibilityLabel="Type"
    />
  );
}
