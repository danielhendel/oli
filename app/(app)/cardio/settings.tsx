import React from "react";

import { ModuleSettingsPlaceholderScreen } from "@/lib/ui/ModuleSettingsPlaceholderScreen";

export default function CardioSettingsScreen() {
  return (
    <ModuleSettingsPlaceholderScreen
      title="Cardio settings"
      description="Cardio preferences and display options will appear here. For now, return to Cardio overview."
      overviewHref="/(app)/cardio"
      overviewButtonLabel="Open Cardio overview"
      overviewAccessibilityLabel="Go to Cardio overview"
    />
  );
}
