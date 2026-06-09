// app/(app)/program/workout.tsx
// Oli — Workout Builder v1. Route composition only: build the typed local draft model and render UI.
import React from "react";
import {
  buildDefaultWorkoutProgramDraft,
  buildWorkoutBuilderModel,
} from "@/lib/data/program/buildWorkoutBuilderModel";
import { WorkoutBuilderScreen } from "@/lib/ui/program/WorkoutBuilderScreen";

export default function WorkoutBuilderRoute() {
  const model = buildWorkoutBuilderModel(buildDefaultWorkoutProgramDraft());
  return <WorkoutBuilderScreen model={model} />;
}
