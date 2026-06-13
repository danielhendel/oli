// app/(app)/program/workout/goal.tsx
// Oli — Program Design: Goal. Route composition only.
import React, { useCallback } from "react";
import { useRouter } from "expo-router";

import { PROGRAM_DESIGN_GOAL_OPTIONS } from "@/lib/data/program/workoutProgramDesignOptions";
import type { ProgramGoal } from "@/lib/data/program/workoutProgramDesignTypes";
import {
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";
import { ProgramDesignOptionScreen } from "@/lib/ui/program/ProgramDesignOptionScreen";

export default function ProgramDesignGoalRoute() {
  const router = useRouter();
  const draft = useWorkoutProgramDesignDraft();

  const onSelect = useCallback(
    (id: ProgramGoal) => {
      workoutProgramDesignStore.setGoal(id);
      router.back();
    },
    [router],
  );

  return (
    <ProgramDesignOptionScreen<ProgramGoal>
      description="What's your headline objective for this program?"
      options={PROGRAM_DESIGN_GOAL_OPTIONS}
      selectedId={draft.goal}
      onSelect={onSelect}
      testIDPrefix="program-goal"
      accessibilityLabel="Goal"
    />
  );
}
