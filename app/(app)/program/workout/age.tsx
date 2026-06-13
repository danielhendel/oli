// app/(app)/program/workout/age.tsx
// Oli — Program Design: Age. Route composition only.
import React, { useCallback } from "react";
import { useRouter } from "expo-router";

import { PROGRAM_DESIGN_AGE_OPTIONS } from "@/lib/data/program/workoutProgramDesignOptions";
import {
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";
import { ProgramDesignOptionScreen } from "@/lib/ui/program/ProgramDesignOptionScreen";

export default function ProgramDesignAgeRoute() {
  const router = useRouter();
  const draft = useWorkoutProgramDesignDraft();

  const onSelect = useCallback(
    (id: string) => {
      const age = Number.parseInt(id, 10);
      if (Number.isFinite(age)) {
        workoutProgramDesignStore.setAge(age);
      }
      router.back();
    },
    [router],
  );

  return (
    <ProgramDesignOptionScreen<string>
      description="How old are you? Used as context for your program."
      options={PROGRAM_DESIGN_AGE_OPTIONS}
      selectedId={draft.age != null ? String(draft.age) : null}
      onSelect={onSelect}
      testIDPrefix="program-age"
      accessibilityLabel="Age"
    />
  );
}
