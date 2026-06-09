// app/(app)/program/recovery.tsx
// Oli — Recovery Builder (premium placeholder). Route composition only.
import React from "react";
import { buildBuilderPlaceholderModel } from "@/lib/data/program/buildBuilderPlaceholderModel";
import { ProgramBuilderPlaceholderScreen } from "@/lib/ui/program/ProgramBuilderPlaceholderScreen";

export default function RecoveryBuilderRoute() {
  return <ProgramBuilderPlaceholderScreen model={buildBuilderPlaceholderModel("recovery")} />;
}
