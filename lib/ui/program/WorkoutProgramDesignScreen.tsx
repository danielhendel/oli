// lib/ui/program/WorkoutProgramDesignScreen.tsx
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type {
  ProgramDesignMuscleGroup,
  ProgramDesignRowModel,
} from "@/lib/data/program/workoutProgramDesignTypes";
import type { ProgrammingPrescription } from "@/lib/data/program/programmingEngineTypes";
import { ProgramDesignCard } from "@/lib/ui/program/ProgramDesignCard";
import {
  GeneratedProgramCards,
  type MuscleExercisePlanContext,
} from "@/lib/ui/program/GeneratedProgramCards";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import {
  UI_APP_SCREEN_BG,
  UI_GROUPED_CARD_RADIUS,
  UI_TAB_ROOT_INSET,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type WorkoutProgramDesignScreenProps = {
  rows: ProgramDesignRowModel[];
  onSelectCategory: (row: ProgramDesignRowModel) => void;
  /** The generated prescription once required inputs are set; null otherwise. */
  prescription: ProgrammingPrescription | null;
  /** Titles of the still-missing required inputs (shown when prescription is null). */
  missingTitles: string[];
  onOpenMuscleVolume: () => void;
  onOpenWeeklySplit: () => void;
  onOpenMuscleExercises: (muscleGroupId: ProgramDesignMuscleGroup) => void;
  onOpenDay: (dayId: string) => void;
  muscleExerciseContext: MuscleExercisePlanContext;
};

/**
 * The redesigned Workout Builder landing page. A single Program Design card with the six input
 * rows, followed by the generated program preview (or a hint listing what's still needed).
 * Presentational only.
 */
export function WorkoutProgramDesignScreen({
  rows,
  onSelectCategory,
  prescription,
  missingTitles,
  onOpenMuscleVolume,
  onOpenWeeklySplit,
  onOpenMuscleExercises,
  onOpenDay,
  muscleExerciseContext,
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

        {prescription ? (
          <GeneratedProgramCards
            prescription={prescription}
            muscleExerciseContext={muscleExerciseContext}
            onOpenMuscleVolume={onOpenMuscleVolume}
            onOpenWeeklySplit={onOpenWeeklySplit}
            onOpenMuscleExercises={onOpenMuscleExercises}
            onOpenDay={onOpenDay}
          />
        ) : (
          <View style={styles.hintCard} testID="program-design-incomplete-hint">
            <Text style={styles.hintTitle}>Generate your program</Text>
            <Text style={styles.hintBody}>
              Set {missingTitles.join(", ")} to generate your weekly sets, frequency, rep ranges,
              and progression model.
            </Text>
          </View>
        )}
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
  hintCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 16,
    gap: 6,
  },
  hintTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  hintBody: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
});
