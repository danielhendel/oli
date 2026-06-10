// app/(app)/program/workout/duration.tsx
// Oli — Program Design: Duration (1–52 weeks). Route composition only.
import React, { useCallback } from "react";
import { useRouter } from "expo-router";

import { PROGRAM_DURATION_OPTIONS } from "@/lib/data/program/workoutProgramDesignOptions";
import {
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";
import { ProgramDesignOptionScreen } from "@/lib/ui/program/ProgramDesignOptionScreen";

export default function ProgramDesignDurationRoute() {
  const router = useRouter();
  const draft = useWorkoutProgramDesignDraft();

  const onSelect = useCallback(
    (id: string) => {
      const weeks = Number.parseInt(id, 10);
      if (Number.isFinite(weeks)) {
        workoutProgramDesignStore.setDurationWeeks(weeks);
      }
      router.back();
    },
    [router],
  );

  return (
    <ProgramDesignOptionScreen<string>
      description="How many weeks will this program run?"
      options={PROGRAM_DURATION_OPTIONS}
      selectedId={draft.durationWeeks != null ? String(draft.durationWeeks) : null}
      onSelect={onSelect}
      testIDPrefix="program-duration"
      accessibilityLabel="Duration"
    />
  );
}
