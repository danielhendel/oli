import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type {
  WorkoutDetailMuscleExerciseSetCountRow,
  WorkoutDetailMuscleSetCountRow,
} from "@/lib/data/workouts/workoutDetailMuscleVolume";
import {
  WorkoutDetailMuscleSetVolumeRows,
  type WorkoutDetailMuscleRowSelection,
} from "@/lib/ui/workouts/WorkoutDetailMuscleSetVolumeRows";
import { WORKOUT_VOLUME_PER_MUSCLE_PROGRESS_FILL } from "@/lib/ui/workouts/workoutOverviewAnalyticsTheme";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { UI_CARD_SURFACE, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import type { MuscleGroup } from "@/lib/workouts/exercises/taxonomy";

/** Displayed card title; exported so screens / tests don't duplicate the literal. */
export const VOLUME_PER_MUSCLE_GROUP_CARD_TITLE = "Volume per Muscle Group" as const;

/**
 * Muted contextual subtitle shown directly under the card title. Mirrors the Dash
 * Weekly Fitness / Strength Baseline / Daily Sleep subtitle rhythm.
 */
export const VOLUME_PER_MUSCLE_GROUP_CARD_SUBTITLE = "This Week" as const;

type Props = {
  rows: readonly WorkoutDetailMuscleSetCountRow[];
  /**
   * Per-exercise breakdown grouped by primary muscle group. Sourced from the same
   * aggregation as {@link rows} (see `buildWeeklyWorkingSetExerciseRowsByMuscle`).
   * Sum of `setCount` across exercises within a muscle equals that muscle's `rows` entry.
   */
  exercisesByMuscleGroup?:
    | Partial<Record<MuscleGroup, readonly WorkoutDetailMuscleExerciseSetCountRow[]>>
    | undefined;
  /** Fires when a muscle row is tapped (full-row pressable; chevron is visual affordance only). */
  onSelectMuscleGroup?: ((selection: WorkoutDetailMuscleRowSelection) => void) | undefined;
  testID?: string;
};

/**
 * Strength overview “Volume per Muscle Group” card (RPE 7–10 working sets).
 *
 * Renders the muscle-set rows with a neutral progress-bar fill so this informational
 * card does not visually compete with the green Strength Baseline bars. When
 * `onSelectMuscleGroup` is provided each row becomes a full-row pressable with a chevron
 * and routes to the shared muscle-group drill-down sheet (same screen used by the Today
 * card). Caller is expected to only mount this card when `rows.length > 0`.
 */
export function WeeklyWorkingVolumeCard({
  rows,
  exercisesByMuscleGroup,
  onSelectMuscleGroup,
  testID = "weekly-working-volume-card",
}: Props): React.ReactElement {
  return (
    <View
      style={styles.card}
      testID={testID}
      accessible
      accessibilityLabel={`${VOLUME_PER_MUSCLE_GROUP_CARD_TITLE}. ${VOLUME_PER_MUSCLE_GROUP_CARD_SUBTITLE}.`}
    >
      <View style={styles.headerBlock}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          {VOLUME_PER_MUSCLE_GROUP_CARD_TITLE}
        </Text>
        <Text style={styles.cardSubtitle} testID="weekly-working-volume-subtitle">
          {VOLUME_PER_MUSCLE_GROUP_CARD_SUBTITLE}
        </Text>
      </View>
      <WorkoutDetailMuscleSetVolumeRows
        rows={rows}
        emptyMessage=""
        testIdPrefix="weekly-working-volume"
        fillColor={WORKOUT_VOLUME_PER_MUSCLE_PROGRESS_FILL}
        onSelectMuscleGroup={onSelectMuscleGroup}
        exercisesByMuscleGroup={exercisesByMuscleGroup}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 15,
    gap: 8,
    ...elevatedCardSurfaceStyle,
  },
  /** Tight title/subtitle stack so the pair reads as one header (matches Dash card rhythm). */
  headerBlock: {
    gap: 2,
  },
  cardTitle: strengthMetricCardTitleTextStyle,
  /** Muted contextual line — same treatment as Weekly Fitness / Strength Baseline / Daily Sleep. */
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.08,
    marginTop: 0,
  },
});
