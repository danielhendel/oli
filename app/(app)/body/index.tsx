import React from "react";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionCard } from "@/lib/ui/ModuleSectionCard";
import { ModuleEmptyState } from "@/lib/ui/ModuleEmptyState";

export default function BodyScreen() {
  return (
    <ModuleScreenShell
      title="Body"
      subtitle="Weight, DEXA, composition"
    >
      <ModuleEmptyState
        title="No body data yet"
        description="Add your first weigh-in or upload a DEXA scan to start building your body composition timeline."
        hint="Coming next: manual weigh-ins, photo check-ins, DEXA upload."
      />

      <ModuleSectionCard
        title="Overview"
        description="A snapshot of your current body metrics and trends."
        rightBadge="Soon"
      />

      <ModuleSectionCard
        title="Recent metrics"
        description="Latest weigh-ins, composition estimates, and key deltas."
        rightBadge="Soon"
      />

      <ModuleSectionCard
        title="Timeline"
        description="Your long-term trendline across weight and composition."
        rightBadge="Soon"
      />
    </ModuleScreenShell>
  );
}
