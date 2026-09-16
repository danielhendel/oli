// app/(app)/(tabs)/today.tsx
// Oli — Today tab: daily health & performance state (Daily Monitor).
import React from "react";

import { DailyMonitorHost } from "@/components/dashboard/DailyMonitorHost";
import { ScreenContainer } from "@/lib/ui/ScreenStates";

export default function TodayScreen() {
  return (
    <ScreenContainer padded={false}>
      <DailyMonitorHost />
    </ScreenContainer>
  );
}
