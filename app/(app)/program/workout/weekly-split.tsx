// app/(app)/program/workout/weekly-split.tsx
// Oli — Program Design: Weekly Split. Route composition only.
import React, { useCallback } from "react";

import {
  buildProgrammingPrescriptionFromDraft,
  missingProgrammingInputTitles,
} from "@/lib/data/program/buildProgrammingPrescription";
import {
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";
import { WeeklySplitSetupScreen } from "@/lib/ui/program/WeeklySplitSetupScreen";

export default function ProgramDesignWeeklySplitRoute() {
  const draft = useWorkoutProgramDesignDraft();
  const prescription = buildProgrammingPrescriptionFromDraft(draft);

  const onChangeDayName = useCallback((dayId: string, name: string) => {
    workoutProgramDesignStore.setSplitDayName(dayId, name);
  }, []);

  const missingHint = `Set ${missingProgrammingInputTitles(draft).join(", ")} on the Program Design screen to generate your weekly split.`;

  return (
    <WeeklySplitSetupScreen
      available={prescription != null}
      dayCount={prescription?.weeklySplit.dayCount ?? null}
      days={prescription?.weeklySplit.days ?? []}
      missingHint={missingHint}
      onChangeDayName={onChangeDayName}
    />
  );
}
