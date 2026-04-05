import React from "react";

import { ModuleSettingsPlaceholderScreen } from "@/lib/ui/ModuleSettingsPlaceholderScreen";

export default function ReadinessSettingsScreen() {
  return (
    <ModuleSettingsPlaceholderScreen
      title="Readiness settings"
      description="Readiness display and integration preferences will appear here. For now, return to Readiness."
      overviewHref="/(app)/recovery/readiness"
      overviewButtonLabel="Open Readiness"
      overviewAccessibilityLabel="Go to Readiness overview"
    />
  );
}
