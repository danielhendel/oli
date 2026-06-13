// app/(app)/program/workout/day/[dayId].tsx
// Day workout page: read the draft, project the day's assigned slots, and render. Thin route only.
import React, { useCallback } from "react";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";

import {
  buildProgramDayMoveTargets,
  findProgramDayWorkout,
} from "@/lib/data/program/buildProgramDayWorkouts";
import {
  buildProgrammingPrescriptionFromDraft,
  missingProgrammingInputTitles,
} from "@/lib/data/program/buildProgrammingPrescription";
import { programExerciseSlotRoute } from "@/lib/data/program/workoutProgramDesignOptions";
import {
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";
import type { ProgramDesignMuscleGroup } from "@/lib/data/program/workoutProgramDesignTypes";
import { useBuilderStackHeader } from "@/lib/ui/headers/useBuilderStackHeader";
import { ProgramDayWorkoutScreen } from "@/lib/ui/program/ProgramDayWorkoutScreen";

export default function ProgramDayWorkoutRoute() {
  const router = useRouter();
  const { dayId: rawDayId } = useLocalSearchParams<{ dayId: string }>();
  const dayId = typeof rawDayId === "string" ? rawDayId : null;

  const draft = useWorkoutProgramDesignDraft();
  const prescription = buildProgrammingPrescriptionFromDraft(draft);

  const dayWorkout =
    prescription != null && dayId != null
      ? findProgramDayWorkout(
          {
            prescription,
            exerciseCountOverrides: draft.exerciseCountOverrides,
            trainingDayOverrides: draft.trainingDayOverrides,
            exerciseSelectionOverrides: draft.exerciseSelectionOverrides,
            slotDayOverrides: draft.slotDayOverrides,
          },
          dayId,
        )
      : null;

  useBuilderStackHeader(dayWorkout?.name ?? "Day");

  const moveTargets =
    prescription != null ? buildProgramDayMoveTargets(prescription, dayId) : [];

  const onSelectSlot = useCallback(
    (muscleGroupId: ProgramDesignMuscleGroup, slotId: string) => {
      router.push(programExerciseSlotRoute(muscleGroupId, slotId) as Href);
    },
    [router],
  );

  const onMoveSlot = useCallback(
    (muscleGroupId: ProgramDesignMuscleGroup, slotId: string, targetDayId: string) => {
      workoutProgramDesignStore.setSlotDayOverride(muscleGroupId, slotId, targetDayId);
    },
    [],
  );

  const missingHint = `Set ${missingProgrammingInputTitles(draft).join(", ")} on the Program Design screen to generate your program structure.`;

  return (
    <ProgramDayWorkoutScreen
      available={prescription != null && dayWorkout != null}
      dayWorkout={dayWorkout}
      moveTargets={moveTargets}
      missingHint={missingHint}
      onSelectSlot={onSelectSlot}
      onMoveSlot={onMoveSlot}
    />
  );
}
