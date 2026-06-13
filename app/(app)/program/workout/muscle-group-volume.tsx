// app/(app)/program/workout/muscle-group-volume.tsx
// Oli — Program Design: Muscle Group Volume. Route composition only.
import React, { useCallback } from "react";

import {
  buildProgrammingPrescriptionFromDraft,
  missingProgrammingInputTitles,
} from "@/lib/data/program/buildProgrammingPrescription";
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
  const prescription = buildProgrammingPrescriptionFromDraft(draft);

  const onChange = useCallback((id: ProgramDesignMuscleGroup, nextValue: number) => {
    workoutProgramDesignStore.setMuscleVolumeOverride(id, nextValue);
  }, []);

  const items: MuscleGroupVolumeItem[] =
    prescription?.muscles.map((m) => ({
      id: m.muscleGroupId,
      label: m.label,
      weeklySets: m.weeklySets,
      frequencyPerWeek: m.frequencyPerWeek,
      repRange: m.repRange,
      rirTarget: m.rirTarget,
      source: m.source,
    })) ?? [];

  const missingHint = `Set ${missingProgrammingInputTitles(draft).join(", ")} on the Program Design screen to generate your weekly sets.`;

  return (
    <MuscleGroupVolumeSetupScreen
      available={prescription != null}
      items={items}
      totalWeeklySets={prescription?.totalWeeklySets ?? 0}
      missingHint={missingHint}
      onChange={onChange}
    />
  );
}
