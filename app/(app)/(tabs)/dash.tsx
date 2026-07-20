// app/(app)/(tabs)/dash.tsx
// Oli — Dash tab: Daily Monitor (Phase 2C) or legacy Dash composition.
// Only one experience host mounts so inactive-host hooks never run.
import React from "react";

import { resolveDashExperienceModeFromFlags } from "@/lib/data/dash/resolveDashExperienceMode";
import { DailyMonitorHost } from "@/components/dashboard/DailyMonitorHost";
import { LegacyDashHost } from "@/components/dashboard/LegacyDashHost";
import { ScreenContainer } from "@/lib/ui/ScreenStates";

export default function DashScreen() {
  const mode = resolveDashExperienceModeFromFlags();

  return (
    <ScreenContainer padded={false}>
      {mode === "daily_monitor" ? <DailyMonitorHost /> : <LegacyDashHost />}
    </ScreenContainer>
  );
}
