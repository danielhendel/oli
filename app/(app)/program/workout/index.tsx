// app/(app)/program/workout/index.tsx
// Oli — Workout Builder landing. Route composition only: read the client-side Program Design
// draft, derive row view-models via a pure selector, and render UI. No business logic here.
import React, { useCallback } from "react";
import { type Href, useRouter } from "expo-router";

import { buildProgramDesignRows } from "@/lib/data/program/buildWorkoutProgramDesignSummary";
import type { ProgramDesignRowModel } from "@/lib/data/program/workoutProgramDesignTypes";
import { useWorkoutProgramDesignDraft } from "@/lib/data/program/workoutProgramDesignStore";
import { WorkoutProgramDesignScreen } from "@/lib/ui/program/WorkoutProgramDesignScreen";

export default function WorkoutBuilderRoute() {
  const router = useRouter();
  const draft = useWorkoutProgramDesignDraft();
  const rows = buildProgramDesignRows(draft);

  const onSelectCategory = useCallback(
    (row: ProgramDesignRowModel) => {
      router.push(row.href as Href);
    },
    [router],
  );

  return <WorkoutProgramDesignScreen rows={rows} onSelectCategory={onSelectCategory} />;
}
