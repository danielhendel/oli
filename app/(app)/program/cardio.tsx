// app/(app)/program/cardio.tsx
// Oli — Cardio Builder (premium placeholder). Route composition only.
import React from "react";
import { buildBuilderPlaceholderModel } from "@/lib/data/program/buildBuilderPlaceholderModel";
import { useBuilderStackHeader } from "@/lib/ui/headers/useBuilderStackHeader";
import { ProgramBuilderPlaceholderScreen } from "@/lib/ui/program/ProgramBuilderPlaceholderScreen";

export default function CardioBuilderRoute() {
  useBuilderStackHeader("Cardio Builder");
  return <ProgramBuilderPlaceholderScreen model={buildBuilderPlaceholderModel("cardio")} />;
}
