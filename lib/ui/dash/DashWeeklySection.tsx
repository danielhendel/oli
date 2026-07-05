import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { UI_TEXT_MUTED, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

type Props = {
  children: React.ReactNode;
};

/** Demotes Weekly Fitness below the non-card Today Command Center. */
export function DashWeeklySection({ children }: Props): React.ReactElement {
  return (
    <View style={styles.wrap} testID="dash-weekly-section">
      <Text style={styles.label} accessibilityRole="header">
        This week
      </Text>
      <Text style={styles.hint}>Weekly progress · separate from today's plan</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 20,
    gap: 4,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
    paddingHorizontal: 4,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
    color: UI_TEXT_MUTED,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
});
