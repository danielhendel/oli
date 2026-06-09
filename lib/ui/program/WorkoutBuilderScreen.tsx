// lib/ui/program/WorkoutBuilderScreen.tsx
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import type { WorkoutBuilderModel } from "@/lib/data/program/workoutBuilderTypes";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET } from "@/lib/ui/theme/uiTokens";
import { WorkoutSetupCard } from "@/lib/ui/program/WorkoutSetupCard";
import { WorkoutScheduleCard } from "@/lib/ui/program/WorkoutScheduleCard";
import { WorkoutVolumeTargetsCard } from "@/lib/ui/program/WorkoutVolumeTargetsCard";
import { WorkoutDaysCard } from "@/lib/ui/program/WorkoutDaysCard";
import { WorkoutExercisePreviewCard } from "@/lib/ui/program/WorkoutExercisePreviewCard";
import { WorkoutReviewCard } from "@/lib/ui/program/WorkoutReviewCard";

export type WorkoutBuilderScreenProps = {
  model: WorkoutBuilderModel;
};

/** Presentational Workout Builder v1 — composes the six section cards from a typed model. */
export function WorkoutBuilderScreen({ model }: WorkoutBuilderScreenProps): React.ReactElement {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="Workout Builder"
    >
      <View style={styles.stack}>
        <WorkoutSetupCard setup={model.draft.setup} />
        <WorkoutScheduleCard schedule={model.draft.schedule} />
        <WorkoutVolumeTargetsCard targets={model.draft.volumeTargets} />
        <WorkoutDaysCard days={model.daySummaries} />
        <WorkoutExercisePreviewCard exercises={model.exercisePreview} />
        <WorkoutReviewCard review={model.review} />
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
