import React from "react";

import { ModuleSettingsPlaceholderScreen } from "@/lib/ui/ModuleSettingsPlaceholderScreen";
import { StrengthGymSettingsSection } from "@/lib/ui/workouts/StrengthGymSettingsSection";

export default function WorkoutsSettingsScreen() {
  return (
    <ModuleSettingsPlaceholderScreen
      title="Strength settings"
      description="Training preferences and defaults will appear here. For now, return to Strength overview."
      overviewHref="/(app)/workouts/overview"
      overviewButtonLabel="Open Strength overview"
      overviewAccessibilityLabel="Go to Strength overview"
      extraActions={<StrengthGymSettingsSection />}
    />
  );
}
