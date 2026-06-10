// lib/ui/profile/digitalTwin/DigitalTwinMetricScreen.tsx
// Blank metric detail placeholder: title + "Metric detail coming soon." + back navigation.
// Presentational only — the route resolves the metric label from the registry.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/lib/ui/ScreenStates";
import {
  UI_GOAL_PILL_SURFACE,
  UI_TAB_ROOT_INSET,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type DigitalTwinMetricScreenProps = {
  title: string;
  onBack: () => void;
};

export function DigitalTwinMetricScreen({
  title,
  onBack,
}: DigitalTwinMetricScreenProps): React.ReactElement {
  return (
    <ScreenContainer padded={false}>
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header" testID="dt-metric-title">
          {title}
        </Text>
        <Text style={styles.comingSoon} testID="dt-metric-coming-soon">
          Metric detail coming soon.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          testID="dt-metric-back"
        >
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  comingSoon: {
    fontSize: 16,
    lineHeight: 22,
    color: UI_TEXT_SECONDARY,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: UI_GOAL_PILL_SURFACE,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  pressed: {
    opacity: 0.85,
  },
});
