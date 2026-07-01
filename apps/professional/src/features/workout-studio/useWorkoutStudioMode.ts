"use client";

import { useMemo, useState } from "react";

import type { WorkoutStudioMode } from "./workoutStudioNavigation";

export const UNTITLED_WORKOUT_TITLE = "Untitled Workout Experience";

export function getDefaultWorkoutStudioMode(workoutTitle: string): WorkoutStudioMode {
  const trimmed = workoutTitle.trim();
  if (!trimmed || trimmed === UNTITLED_WORKOUT_TITLE) {
    return "overview";
  }
  return "blocks";
}

export function useWorkoutStudioMode(workoutTitle: string): {
  activeMode: WorkoutStudioMode;
  setActiveMode: (mode: WorkoutStudioMode) => void;
  isBlocksMode: boolean;
  isOverviewMode: boolean;
  isStatsMode: boolean;
} {
  const [activeMode, setActiveMode] = useState<WorkoutStudioMode>(() =>
    getDefaultWorkoutStudioMode(workoutTitle),
  );

  return useMemo(
    () => ({
      activeMode,
      setActiveMode,
      isBlocksMode: activeMode === "blocks",
      isOverviewMode: activeMode === "overview",
      isStatsMode: activeMode === "stats",
    }),
    [activeMode],
  );
}
