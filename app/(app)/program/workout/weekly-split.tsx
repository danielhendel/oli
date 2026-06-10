// app/(app)/program/workout/weekly-split.tsx
// Oli — Program Design: Weekly Split. Route composition only.
import React, { useCallback } from "react";

import {
  useWorkoutProgramDesignDraft,
  workoutProgramDesignStore,
} from "@/lib/data/program/workoutProgramDesignStore";
import { WeeklySplitSetupScreen } from "@/lib/ui/program/WeeklySplitSetupScreen";

export default function ProgramDesignWeeklySplitRoute() {
  const draft = useWorkoutProgramDesignDraft();
  const split = draft.weeklySplit;

  const onSelectDayCount = useCallback((count: number) => {
    workoutProgramDesignStore.setWeeklySplitDayCount(count);
  }, []);

  const onChangeDayName = useCallback((dayId: string, name: string) => {
    workoutProgramDesignStore.setWeeklySplitDayName(dayId, name);
  }, []);

  return (
    <WeeklySplitSetupScreen
      dayCount={split?.dayCount ?? null}
      days={split?.days ?? []}
      onSelectDayCount={onSelectDayCount}
      onChangeDayName={onChangeDayName}
    />
  );
}
