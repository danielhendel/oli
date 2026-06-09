// app/(app)/program/nutrition.tsx
// Oli — Nutrition Builder (premium placeholder). Route composition only.
import React from "react";
import { buildBuilderPlaceholderModel } from "@/lib/data/program/buildBuilderPlaceholderModel";
import { ProgramBuilderPlaceholderScreen } from "@/lib/ui/program/ProgramBuilderPlaceholderScreen";

export default function NutritionBuilderRoute() {
  return <ProgramBuilderPlaceholderScreen model={buildBuilderPlaceholderModel("nutrition")} />;
}
