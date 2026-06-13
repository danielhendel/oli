// app/(app)/program/workout/training-days.tsx
// Oli — Program Design: Training Days. Route composition only.
import React, { useCallback } from "react";
import { useRouter } from "expo-router";

import { TRAINING_DAYS_OPTIONS } from "@/lib/data/program/workoutProgramDesignOptions";
import {
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";
import { ProgramDesignOptionScreen } from "@/lib/ui/program/ProgramDesignOptionScreen";

export default function ProgramDesignTrainingDaysRoute() {
  const router = useRouter();
  const draft = useWorkoutProgramDesignDraft();

  const onSelect = useCallback(
    (id: string) => {
      const days = Number.parseInt(id, 10);
      if (Number.isFinite(days)) {
        workoutProgramDesignStore.setTrainingDays(days);
      }
      router.back();
    },
    [router],
  );

  return (
    <ProgramDesignOptionScreen<string>
      description="How many days per week will you train? This shapes frequency and your split."
      options={TRAINING_DAYS_OPTIONS}
      selectedId={draft.trainingDays != null ? String(draft.trainingDays) : null}
      onSelect={onSelect}
      testIDPrefix="program-training-days"
      accessibilityLabel="Training Days"
    />
  );
}
