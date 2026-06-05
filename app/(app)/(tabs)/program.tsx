// app/(app)/(tabs)/program.tsx
// Oli — Program: tab root where users create and manage training programs.
import React from "react";
import { View, StyleSheet } from "react-native";
import { ScreenContainer, EmptyState } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { SettingsGearButton } from "@/lib/ui/SettingsGearButton";
import { UI_APP_SCREEN_BG } from "@/lib/ui/theme/uiTokens";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";

export default function ProgramScreen() {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  return (
    <ScreenContainer padded={false}>
      <View style={styles.root}>
        <TabRootScreenHeader title="Program" rightSlot={<SettingsGearButton />} />
        <View
          style={[styles.body, { paddingBottom: scrollPaddingBottom }]}
          accessibilityLabel="Program"
        >
          <EmptyState
            title="Build your program"
            description="Create and manage your training programs here."
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  body: {
    flex: 1,
  },
});
