// app/(onboarding)/understand.tsx
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useConnectUnderstandCompatibilityRedirect } from "@/lib/onboarding/useConnectUnderstandCompatibilityRedirect";
import { UI_APP_SCREEN_BG } from "@/lib/ui/theme/uiTokens";

/**
 * Compatibility route only — not part of mandatory Stage 2 onboarding.
 * Incomplete About You → About You. Complete profile → Home.
 * Starts no readiness / processing work.
 */
export default function UnderstandCompatibilityRoute() {
  useConnectUnderstandCompatibilityRedirect();

  return (
    <View style={{ flex: 1, backgroundColor: UI_APP_SCREEN_BG, justifyContent: "center" }}>
      <ActivityIndicator accessibilityLabel="Continuing" />
    </View>
  );
}
