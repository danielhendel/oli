// app/(app)/program/workout/sex.tsx
// Oli — Program Design: Sex. Route composition only.
import React, { useCallback } from "react";
import { useRouter } from "expo-router";

import { PROGRAM_DESIGN_SEX_OPTIONS } from "@/lib/data/program/workoutProgramDesignOptions";
import type { ProgramVolumeSex } from "@/lib/data/program/workoutProgramDesignTypes";
import {
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";
import { ProgramDesignOptionScreen } from "@/lib/ui/program/ProgramDesignOptionScreen";

export default function ProgramDesignSexRoute() {
  const router = useRouter();
  const draft = useWorkoutProgramDesignDraft();

  const onSelect = useCallback(
    (id: ProgramVolumeSex) => {
      workoutProgramDesignStore.setSex(id);
      router.back();
    },
    [router],
  );

  return (
    <ProgramDesignOptionScreen<ProgramVolumeSex>
      description="Base training volume is calibrated by sex."
      options={PROGRAM_DESIGN_SEX_OPTIONS}
      selectedId={draft.sex}
      onSelect={onSelect}
      testIDPrefix="program-sex"
      accessibilityLabel="Sex"
    />
  );
}
