// app/(app)/labs/index.tsx
import React from "react";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionCard } from "@/lib/ui/ModuleSectionCard";
import { ModuleEmptyState } from "@/lib/ui/ModuleEmptyState";

export default function LabsScreen() {
  return (
    <ModuleScreenShell
      title="Labs"
      subtitle="Bloodwork & biomarkers"
    >
      <ModuleEmptyState
        title="No labs uploaded yet"
        description="Upload your first lab panel to track biomarkers over time."
        hint="Coming next: uploads, panel parsing, and trend charts."
      />

      <ModuleSectionCard
        title="Latest panel"
        description="Your most recent biomarker snapshot."
        rightBadge="Soon"
      />

      <ModuleSectionCard
        title="Trends"
        description="Longitudinal biomarker history and deltas."
        rightBadge="Soon"
      />

      <ModuleSectionCard
        title="Insights"
        description="Flagged biomarkers and context."
        rightBadge="Soon"
      />
    </ModuleScreenShell>
  );
}
