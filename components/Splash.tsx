// components/Splash.tsx
/**
 * Purpose: Full-screen loading placeholder used during auth bootstrap and other
 * blocking transitions (e.g., first-run provisioning).
 * Inputs: none
 * Side-effects: none
 * Errors: none
 */

import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme/ThemeProvider";

export default function Splash() {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
      // For screen readers + tests
      accessible
      accessibilityLabel="Loading"
      testID="splash"
    >
      <ActivityIndicator size="large" />
    </View>
  );
}
