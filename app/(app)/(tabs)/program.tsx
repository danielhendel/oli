// app/(app)/(tabs)/program.tsx
// Oli — Plan: honest shell for human- or professionally authored plans.
import React from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET } from "@/lib/ui/theme/uiTokens";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import type { ProgramSummary } from "@/lib/data/program/types";
import { ProgramCurrentScreen } from "@/lib/ui/program/ProgramCurrentScreen";

export default function ProgramScreen() {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);

  // v1: no program document persistence yet — active plans list stays empty.
  const currentPrograms: ProgramSummary[] = [];

  return (
    <ScreenContainer padded={false}>
      <View style={styles.root}>
        <TabRootScreenHeader title="Plan" subtitle="What am I doing?" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
          showsVerticalScrollIndicator={false}
        >
          <ProgramCurrentScreen programs={currentPrograms} embedded />
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 4,
    gap: 16,
  },
});
