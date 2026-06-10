// app/(app)/program/workout/muscle-group-volume.tsx
// Oli — Program Design: Muscle Group Volume. Route composition only.
import React, { useCallback } from "react";

import {
  PROGRAM_DESIGN_MUSCLE_GROUP_LABEL,
  PROGRAM_DESIGN_MUSCLE_GROUP_ORDER,
} from "@/lib/data/program/workoutProgramDesignOptions";
import type { ProgramDesignMuscleGroup } from "@/lib/data/program/workoutProgramDesignTypes";
import {
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";
import {
  MuscleGroupVolumeSetupScreen,
  type MuscleGroupVolumeItem,
} from "@/lib/ui/program/MuscleGroupVolumeSetupScreen";

export default function ProgramDesignMuscleGroupVolumeRoute() {
  const draft = useWorkoutProgramDesignDraft();

  const items: MuscleGroupVolumeItem[] = PROGRAM_DESIGN_MUSCLE_GROUP_ORDER.map((id) => ({
    id,
    label: PROGRAM_DESIGN_MUSCLE_GROUP_LABEL[id],
    value: draft.muscleGroupVolume[id] ?? 0,
  }));

  const onChange = useCallback((id: ProgramDesignMuscleGroup, nextValue: number) => {
    workoutProgramDesignStore.setMuscleVolume(id, nextValue);
  }, []);

  return <MuscleGroupVolumeSetupScreen items={items} onChange={onChange} />;
}
