// app/(app)/recovery/index.tsx
import React from "react";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionCard } from "@/lib/ui/ModuleSectionCard";
import { ModuleEmptyState } from "@/lib/ui/ModuleEmptyState";

export default function RecoveryScreen() {
  return (
    <ModuleScreenShell
      title="Recovery"
      subtitle="Sleep & readiness"
    >
      <ModuleEmptyState
        title="Recovery isn’t connected yet"
        description="Connect a wearable to track sleep, readiness, and recovery signals."
        hint="Coming next: sleep summary, readiness score, and recovery insights."
      />

      <ModuleSectionCard
        title="Sleep"
        description="Duration, efficiency, and quality trends."
        rightBadge="Soon"
      />

      <ModuleSectionCard
        title="Readiness"
        description="Daily recovery status and training guidance."
        rightBadge="Soon"
      />

      <ModuleSectionCard
        title="Signals"
        description="HRV, resting HR, stress, and related metrics."
        rightBadge="Soon"
      />
    </ModuleScreenShell>
  );
}
