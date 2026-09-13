// app/(app)/(tabs)/dash.tsx
// Oli — Home tab: whole-person health & performance map.
import React from "react";

import { HomeScreenContent } from "@/lib/ui/home/HomeScreenContent";
import { ScreenContainer } from "@/lib/ui/ScreenStates";

export default function DashScreen() {
  return (
    <ScreenContainer padded={false}>
      <HomeScreenContent />
    </ScreenContainer>
  );
}
