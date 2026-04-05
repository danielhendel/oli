import React from "react";

import { ModuleSettingsPlaceholderScreen } from "@/lib/ui/ModuleSettingsPlaceholderScreen";

export default function SleepSettingsScreen() {
  return (
    <ModuleSettingsPlaceholderScreen
      title="Sleep settings"
      description="Sleep display and integration preferences will appear here. For now, return to Sleep."
      overviewHref="/(app)/recovery/sleep"
      overviewButtonLabel="Open Sleep"
      overviewAccessibilityLabel="Go to Sleep overview"
    />
  );
}
