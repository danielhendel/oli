import React from "react";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionCard } from "@/lib/ui/ModuleSectionCard";

export default function SettingsScreen() {
  return (
    <ModuleScreenShell
      title="Settings"
      subtitle="Account, privacy, devices"
    >
      <ModuleSectionCard
        title="Account"
        description="Profile, authentication, and security."
        rightBadge="Soon"
      />

      <ModuleSectionCard
        title="Privacy"
        description="Data controls, permissions, and export."
        rightBadge="Soon"
      />

      <ModuleSectionCard
        title="Devices"
        description="Connect and manage integrations."
        rightBadge="Soon"
      />
    </ModuleScreenShell>
  );
}
