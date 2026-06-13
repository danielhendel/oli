// app/(app)/program/nutrition.tsx
// Oli — Nutrition Builder (premium placeholder). Route composition only.
import React from "react";
import { buildBuilderPlaceholderModel } from "@/lib/data/program/buildBuilderPlaceholderModel";
import { useBuilderStackHeader } from "@/lib/ui/headers/useBuilderStackHeader";
import { ProgramBuilderPlaceholderScreen } from "@/lib/ui/program/ProgramBuilderPlaceholderScreen";

export default function NutritionBuilderRoute() {
  useBuilderStackHeader("Nutrition Builder");
  return <ProgramBuilderPlaceholderScreen model={buildBuilderPlaceholderModel("nutrition")} />;
}
