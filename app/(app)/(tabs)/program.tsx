// app/(app)/(tabs)/program.tsx
// Oli — Program: tab root showing the user's current programs. The header "+" opens the Program
// Builder hub (app/(app)/program/builder) where the four builders live. Route composition only —
// no persistence in v1, so the body renders a clean empty explainer.
import React from "react";
import { View, StyleSheet } from "react-native";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { UI_APP_SCREEN_BG } from "@/lib/ui/theme/uiTokens";
import type { ProgramSummary } from "@/lib/data/program/types";
import { ProgramAddButton } from "@/lib/ui/program/ProgramAddButton";
import { ProgramCurrentScreen } from "@/lib/ui/program/ProgramCurrentScreen";

export default function ProgramScreen() {
  // v1: no persistence yet (see lib/data/program/types.ts). Programs land empty until program
  // documents exist; this screen renders the explainer empty state in the meantime.
  const currentPrograms: ProgramSummary[] = [];

  return (
    <ScreenContainer padded={false}>
      <View style={styles.root}>
        <TabRootScreenHeader title="Program" rightSlot={<ProgramAddButton />} />
        <ProgramCurrentScreen programs={currentPrograms} />
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
