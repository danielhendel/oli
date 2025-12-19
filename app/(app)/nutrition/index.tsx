// app/(app)/nutrition/index.tsx
import React from "react";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionCard } from "@/lib/ui/ModuleSectionCard";
import { ModuleEmptyState } from "@/lib/ui/ModuleEmptyState";

export default function NutritionScreen() {
  return (
    <ModuleScreenShell
      title="Nutrition"
      subtitle="Macros & micros"
    >
      <ModuleEmptyState
        title="No nutrition data yet"
        description="Connect a nutrition tracker or start logging meals to build your macro and micronutrient profile."
        hint="Coming next: targets, daily summary, and imports."
      />

      <ModuleSectionCard
        title="Today"
        description="Daily macro progress and energy intake."
        rightBadge="Soon"
      />

      <ModuleSectionCard
        title="Targets"
        description="Your macro and micronutrient targets and adherence."
        rightBadge="Soon"
      />

      <ModuleSectionCard
        title="Trends"
        description="Weekly averages and consistency over time."
        rightBadge="Soon"
      />
    </ModuleScreenShell>
  );
}
