import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type {
  WorkoutDetailMuscleExerciseSetCountRow,
  WorkoutDetailMuscleSetCountRow,
} from "@/lib/data/workouts/workoutDetailMuscleVolume";
import {
  WorkoutDetailMuscleSetVolumeRows,
  type WorkoutDetailMuscleRowSelection,
} from "@/lib/ui/workouts/WorkoutDetailMuscleSetVolumeRows";
import { ENERGY_BASELINE_FILL_COLOR } from "@/lib/ui/energy/EnergyBaselineProgressTrack";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import type { MuscleGroup } from "@/lib/workouts/exercises/taxonomy";

/** Displayed card title; exported so screens / tests don't duplicate the literal. */
export const WEEKLY_VOLUME_CARD_TITLE = "Weekly Volume" as const;

/**
 * @deprecated Use {@link WEEKLY_VOLUME_CARD_TITLE}. Kept as a thin alias so any
 * unintentional importer keeps compiling. The legacy literal `"Volume per Muscle Group"`
 * has been replaced by `"Weekly Volume"`.
 */
export const VOLUME_PER_MUSCLE_GROUP_CARD_TITLE = WEEKLY_VOLUME_CARD_TITLE;

/**
 * Muted contextual subtitle shown only when the card is rendered **without** a week navigator
 * (e.g. in isolation outside the Strength overview). When the screen passes `weekRangeLabel`,
 * the chevron cluster replaces the subtitle so the date range itself ("May 24–30") communicates
 * the displayed week.
 */
export const WEEKLY_VOLUME_CARD_FALLBACK_SUBTITLE = "This Week" as const;

/** @deprecated Use {@link WEEKLY_VOLUME_CARD_FALLBACK_SUBTITLE}. */
export const VOLUME_PER_MUSCLE_GROUP_CARD_SUBTITLE = WEEKLY_VOLUME_CARD_FALLBACK_SUBTITLE;

/** Empty-state copy when the user navigates to a week with no qualifying working sets. */
export const WEEKLY_VOLUME_EMPTY_WEEK_MESSAGE = "No working sets logged this week" as const;

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
  /**
   * Optional Activity-style week-range label (e.g. `"May 24\u201330"`). When provided the
   * subtitle is replaced by a chevron cluster matching the Strength This Week card — same
   * visuals, same disabled rules, no shared state.
   */
  weekRangeLabel?: string;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onPressPrevious?: () => void;
  onPressNext?: () => void;
  testID?: string;
};

/**
 * Strength overview “Weekly Volume” card (RPE 7–10 working sets per muscle group).
 *
 * Renders the muscle-set rows with the shared Oli blue progress-bar fill
 * ({@link ENERGY_BASELINE_FILL_COLOR}) so all Strength overview progress bars read as one
 * visual system alongside Activity / Sleep. When `onSelectMuscleGroup` is provided each row
 * becomes a full-row pressable with a chevron and routes to the shared muscle-group drill-down
 * sheet (same screen used by the Today card).
 *
 * When the screen passes `weekRangeLabel`, the card header carries the same Activity-style
 * chevron cluster used by the Strength `This Week` card. State (`selectedVolumeWeekAnchorDay`)
 * is owned by the screen — this component is presentation-only.
 */
export function WeeklyWorkingVolumeCard({
  rows,
  exercisesByMuscleGroup,
  onSelectMuscleGroup,
  weekRangeLabel,
  canGoPrevious = true,
  canGoNext = false,
  onPressPrevious,
  onPressNext,
  testID = "weekly-working-volume-card",
}: Props): React.ReactElement {
  const hasNavCluster = weekRangeLabel != null;
  const previousDisabled = !canGoPrevious || onPressPrevious == null;
  const nextDisabled = !canGoNext || onPressNext == null;

  const accessibilityLabel = hasNavCluster
    ? `${WEEKLY_VOLUME_CARD_TITLE}. Week of ${weekRangeLabel}.`
    : `${WEEKLY_VOLUME_CARD_TITLE}. ${WEEKLY_VOLUME_CARD_FALLBACK_SUBTITLE}.`;

  const navCluster = hasNavCluster ? (
    <View style={styles.weekNavRow} testID="weekly-working-volume-nav">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous week"
        accessibilityState={{ disabled: previousDisabled }}
        disabled={previousDisabled}
        onPress={onPressPrevious}
        hitSlop={10}
        testID="weekly-working-volume-nav-previous"
        style={({ pressed }) => [
          styles.weekNavButton,
          previousDisabled && styles.weekNavButtonDisabled,
          pressed && !previousDisabled && styles.weekNavButtonPressed,
        ]}
      >
        <Ionicons name="chevron-back" size={16} color={UI_TEXT_PRIMARY} />
      </Pressable>
      <Text
        style={styles.weekRangeLabel}
        numberOfLines={1}
        accessibilityLabel={`Week of ${weekRangeLabel}`}
        testID="weekly-working-volume-range-label"
      >
        {weekRangeLabel}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next week"
        accessibilityState={{ disabled: nextDisabled }}
        disabled={nextDisabled}
        onPress={onPressNext}
        hitSlop={10}
        testID="weekly-working-volume-nav-next"
        style={({ pressed }) => [
          styles.weekNavButton,
          nextDisabled && styles.weekNavButtonDisabled,
          pressed && !nextDisabled && styles.weekNavButtonPressed,
        ]}
      >
        <Ionicons name="chevron-forward" size={16} color={UI_TEXT_PRIMARY} />
      </Pressable>
    </View>
  ) : null;

  return (
    <View
      style={styles.card}
      testID={testID}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      {hasNavCluster ? (
        <View style={styles.headerRow}>
          <Text style={styles.cardTitle} accessibilityRole="header">
            {WEEKLY_VOLUME_CARD_TITLE}
          </Text>
          <View style={styles.headerSpacer} />
          {navCluster}
        </View>
      ) : (
        <View style={styles.headerBlock}>
          <Text style={styles.cardTitle} accessibilityRole="header">
            {WEEKLY_VOLUME_CARD_TITLE}
          </Text>
          <Text style={styles.cardSubtitle} testID="weekly-working-volume-subtitle">
            {WEEKLY_VOLUME_CARD_FALLBACK_SUBTITLE}
          </Text>
        </View>
      )}
      <WorkoutDetailMuscleSetVolumeRows
        rows={rows}
        emptyMessage={hasNavCluster ? WEEKLY_VOLUME_EMPTY_WEEK_MESSAGE : ""}
        testIdPrefix="weekly-working-volume"
        fillColor={ENERGY_BASELINE_FILL_COLOR}
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
  /** Tight title/subtitle stack used when the screen does not provide a navigator. */
  headerBlock: {
    gap: 2,
  },
  /** Single-row header when the screen provides a navigator (mirrors Strength This Week). */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 8,
  },
  cardTitle: strengthMetricCardTitleTextStyle,
  /** Muted contextual line — only used in the no-navigator (standalone) layout. */
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.08,
    marginTop: 0,
  },
  weekNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  weekNavButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  weekNavButtonDisabled: {
    opacity: 0.35,
  },
  weekNavButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  weekRangeLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
    minWidth: 88,
    textAlign: "center",
  },
});
