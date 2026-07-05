// app/(app)/(tabs)/program.tsx
// Oli — Program: tab root showing plan category cards + current programs.
import React, { useMemo } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET } from "@/lib/ui/theme/uiTokens";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import type { ProgramSummary } from "@/lib/data/program/types";
import { buildProgramCategoryCards } from "@/lib/data/program/buildProgramCategoryCards";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { resolveWeeklyFitnessGoals } from "@/lib/preferences/weeklyFitnessGoals";
import { ProgramAddButton } from "@/lib/ui/program/ProgramAddButton";
import { ProgramCategoryCards } from "@/lib/ui/program/ProgramCategoryCards";
import { ProgramCurrentScreen } from "@/lib/ui/program/ProgramCurrentScreen";

export default function ProgramScreen() {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  const { state: prefState } = usePreferences();
  const goals = useMemo(
    () => resolveWeeklyFitnessGoals(prefState.preferences),
    [prefState.preferences, prefState.preferences.weeklyFitnessGoals?.updatedAt],
  );
  const categoryCards = useMemo(() => buildProgramCategoryCards(goals), [goals]);

  // v1: no program document persistence yet — active programs list stays empty.
  const currentPrograms: ProgramSummary[] = [];

  return (
    <ScreenContainer padded={false}>
      <View style={styles.root}>
        <TabRootScreenHeader title="Program" rightSlot={<ProgramAddButton />} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
          showsVerticalScrollIndicator={false}
        >
          <ProgramCategoryCards cards={categoryCards} />
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
