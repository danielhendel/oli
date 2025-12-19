// app/(app)/workouts/index.tsx
import React from "react";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionCard } from "@/lib/ui/ModuleSectionCard";
import { ModuleEmptyState } from "@/lib/ui/ModuleEmptyState";

export default function WorkoutsScreen() {
  return (
    <ModuleScreenShell
      title="Training"
      subtitle="Strength & cardio"
    >
      <ModuleEmptyState
        title="No training logged yet"
        description="Log a workout to begin tracking volume, progression, and performance."
        hint="Coming next: manual logging, templates, and history."
      />

      <ModuleSectionCard
        title="Today"
        description="Quick entry to start or log your next session."
        rightBadge="Soon"
      />

      <ModuleSectionCard
        title="Recent sessions"
        description="Your latest workouts and training consistency."
        rightBadge="Soon"
      />

      <ModuleSectionCard
        title="Progress"
        description="Strength trends and performance markers over time."
        rightBadge="Soon"
      />
    </ModuleScreenShell>
  );
}
