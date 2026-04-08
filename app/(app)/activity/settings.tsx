import React from "react";

import { ModuleSettingsPlaceholderScreen } from "@/lib/ui/ModuleSettingsPlaceholderScreen";

export default function ActivitySettingsScreen() {
  return (
    <ModuleSettingsPlaceholderScreen
      title="Activity settings"
      description="Activity display and data source preferences will appear here. For now, return to Activity."
      overviewHref="/(app)/activity"
      overviewButtonLabel="Open Activity"
      overviewAccessibilityLabel="Go to Activity overview"
    />
  );
}
