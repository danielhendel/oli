// lib/ui/program/ProgramBuilderHubScreen.tsx
// The Program Builder hub: the four builder cards (Workout, Cardio, Nutrition, Recovery), reached
// from the Program tab "+" button. Presentational only — navigation is delegated to the caller.
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { ProgramBuilderCardModel, ProgramBuilderType } from "@/lib/data/program/types";
import { ProgramBuilderCard } from "@/lib/ui/program/ProgramBuilderCard";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import {
  UI_APP_SCREEN_BG,
  UI_TAB_ROOT_INSET,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type ProgramBuilderHubScreenProps = {
  builders: ProgramBuilderCardModel[];
  onOpenBuilder: (type: ProgramBuilderType) => void;
};

export function ProgramBuilderHubScreen({
  builders,
  onOpenBuilder,
}: ProgramBuilderHubScreenProps): React.ReactElement {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="Program Builder"
    >
      <Text style={styles.intro}>
        Build each part of your plan. Combine them into a complete program.
      </Text>
      <View style={styles.grid} testID="program-builder-hub-grid">
        {builders.map((builder) => (
          <ProgramBuilderCard key={builder.type} model={builder} onPress={onOpenBuilder} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  content: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 12,
  },
  intro: {
    fontSize: 15,
    lineHeight: 21,
    color: UI_TEXT_SECONDARY,
    marginBottom: 14,
  },
  grid: {
    gap: 12,
  },
});
