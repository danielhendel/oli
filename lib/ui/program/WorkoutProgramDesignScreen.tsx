// lib/ui/program/WorkoutProgramDesignScreen.tsx
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import type { ProgramDesignRowModel } from "@/lib/data/program/workoutProgramDesignTypes";
import { ProgramDesignCard } from "@/lib/ui/program/ProgramDesignCard";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET } from "@/lib/ui/theme/uiTokens";

export type WorkoutProgramDesignScreenProps = {
  rows: ProgramDesignRowModel[];
  onSelectCategory: (row: ProgramDesignRowModel) => void;
};

/**
 * The redesigned Workout Builder landing page. Presentational only: a single Program Design
 * card whose rows navigate to each category's setup page. The old multi-card setup layout is gone.
 */
export function WorkoutProgramDesignScreen({
  rows,
  onSelectCategory,
}: WorkoutProgramDesignScreenProps): React.ReactElement {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="Workout Builder"
    >
      <View style={styles.stack}>
        <ProgramDesignCard rows={rows} onSelectCategory={onSelectCategory} />
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
  stack: {
    gap: 16,
  },
});
