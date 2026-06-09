// app/(app)/(tabs)/program.tsx
// Oli — Program: tab root command center for creating and managing health programs.
// Route composition only: build the view-model via a pure selector and render UI from lib/ui/program.
import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { type Href, useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { SettingsGearButton } from "@/lib/ui/SettingsGearButton";
import { UI_APP_SCREEN_BG } from "@/lib/ui/theme/uiTokens";
import { buildProgramHomeModel } from "@/lib/data/program/buildProgramHomeModel";
import type { ProgramBuilderType } from "@/lib/data/program/types";
import { ProgramHomeScreen } from "@/lib/ui/program/ProgramHomeScreen";

export default function ProgramScreen() {
  const router = useRouter();
  const model = buildProgramHomeModel();

  const onOpenBuilder = useCallback(
    (type: ProgramBuilderType) => {
      const card = model.builders.find((b) => b.type === type);
      if (card?.href) router.push(card.href as Href);
    },
    [model.builders, router],
  );

  return (
    <ScreenContainer padded={false}>
      <View style={styles.root}>
        <TabRootScreenHeader title="Program" rightSlot={<SettingsGearButton />} />
        <ProgramHomeScreen model={model} onOpenBuilder={onOpenBuilder} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
});
