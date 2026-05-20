import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  WorkoutDetailMuscleExerciseSetCountRow,
  WorkoutDetailMuscleSetCountRow,
} from "@/lib/data/workouts/workoutDetailMuscleVolume";
import { WORKOUT_DETAIL_MUSCLE_GROUP_LABELS } from "@/lib/data/workouts/workoutDetailMuscleVolume";
import {
  WORKOUT_MUSCLE_SET_VOLUME_RANGE_LABELS,
  workoutMuscleSetVolumeRangeFromSetCount,
  workoutMuscleSetVolumeRangeProgress01,
} from "@/lib/data/workouts/workoutDetailMuscleSetVolumeRange";
import { formatCompletedSetsLabel } from "@/lib/data/workouts/workoutDisplay";
import { LinearProgressBar } from "@/lib/ui/primitives/LinearProgressBar";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL } from "@/lib/ui/workouts/workoutOverviewAnalyticsTheme";
import { UI_BORDER_HAIRLINE, UI_PROGRESS_TRACK_EMPTY, UI_TEXT_MUTED } from "@/lib/ui/theme/uiTokens";
import type { MuscleGroup } from "@/lib/workouts/exercises/taxonomy";

export type WorkoutDetailMuscleRowSelection = {
  muscleGroup: MuscleGroup;
  label: string;
  totalSetCount: number;
  exercises: readonly WorkoutDetailMuscleExerciseSetCountRow[];
};

type Props = {
  rows: readonly WorkoutDetailMuscleSetCountRow[];
  emptyMessage: string;
  testIdPrefix: string;
  unassignedSetCount?: number;
  /**
   * Optional progress-bar fill color. Defaults to the strength overview green
   * ({@link WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL}). Pass a neutral fill (e.g.
   * `WORKOUT_VOLUME_PER_MUSCLE_PROGRESS_FILL`) to deprioritize the bars visually.
   */
  fillColor?: string;
  /**
   * When provided, each row renders as a full-row {@link Pressable} with a trailing chevron
   * and calls back with the row's selection. `exercisesByMuscleGroup` supplies the
   * contributing exercise rows for the drill-down sheet. When omitted, rows render as plain
   * non-interactive views (existing day-detail behavior, unchanged).
   */
  onSelectMuscleGroup?: ((selection: WorkoutDetailMuscleRowSelection) => void) | undefined;
  exercisesByMuscleGroup?:
    | Partial<Record<MuscleGroup, readonly WorkoutDetailMuscleExerciseSetCountRow[]>>
    | undefined;
};

function formatUnassignedFooter(count: number): string {
  return `${formatCompletedSetsLabel(count)} not assigned to a muscle group`;
}

export function WorkoutDetailMuscleSetVolumeRows({
  rows,
  emptyMessage,
  testIdPrefix,
  unassignedSetCount = 0,
  fillColor = WORKOUT_STRENGTH_OVERVIEW_PROGRESS_FILL,
  onSelectMuscleGroup,
  exercisesByMuscleGroup,
}: Props): React.ReactElement {
  const showUnassigned = unassignedSetCount > 0;
  const interactive = onSelectMuscleGroup != null;

  const handlePress = useCallback(
    (row: WorkoutDetailMuscleSetCountRow) => {
      if (onSelectMuscleGroup == null) return;
      const label = WORKOUT_DETAIL_MUSCLE_GROUP_LABELS[row.muscleGroup];
      onSelectMuscleGroup({
        muscleGroup: row.muscleGroup,
        label,
        totalSetCount: row.setCount,
        exercises: exercisesByMuscleGroup?.[row.muscleGroup] ?? [],
      });
    },
    [onSelectMuscleGroup, exercisesByMuscleGroup],
  );

  if (rows.length === 0 && !showUnassigned) {
    return <Text style={styles.placeholder}>{emptyMessage}</Text>;
  }

  return (
    <View>
      {rows.length > 0 ? (
        <View style={styles.rowsWrap} accessibilityRole="list">
          {rows.map((row) => {
            const label = WORKOUT_DETAIL_MUSCLE_GROUP_LABELS[row.muscleGroup];
            const setsLabel = formatCompletedSetsLabel(row.setCount);
            const range = workoutMuscleSetVolumeRangeFromSetCount(row.setCount);
            const progress = workoutMuscleSetVolumeRangeProgress01(row.setCount);
            const rangeLabel = WORKOUT_MUSCLE_SET_VOLUME_RANGE_LABELS[range];
            const rowTestId = `${testIdPrefix}-${row.muscleGroup}`;
            const a11yLabel = interactive
              ? `Open ${label} working volume breakdown, ${setsLabel}, ${rangeLabel} volume`
              : `${label}, ${setsLabel}, ${rangeLabel} volume`;

            const body = (
              <>
                <View style={styles.rowTop}>
                  <Text style={[dashMetricRowLabelTextStyle, styles.rowLabel]} numberOfLines={1}>
                    {label}
                  </Text>
                  <View style={styles.rowValueGroup}>
                    <Text
                      style={[dashMetricRowValueTextStyle, styles.rowValue]}
                      numberOfLines={1}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      {setsLabel}
                    </Text>
                    {interactive ? (
                      <Text
                        style={styles.rowChevron}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                      >
                        {"\u203A"}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <LinearProgressBar
                  progress={progress}
                  trackColor={UI_PROGRESS_TRACK_EMPTY}
                  fillColor={fillColor}
                  height={8}
                  borderRadius={4}
                  testID={`${testIdPrefix}-bar-${row.muscleGroup}`}
                />
              </>
            );

            if (interactive) {
              return (
                <Pressable
                  key={row.muscleGroup}
                  testID={rowTestId}
                  accessibilityRole="button"
                  accessibilityLabel={a11yLabel}
                  onPress={() => handlePress(row)}
                  style={({ pressed }) => [
                    styles.row,
                    styles.rowInteractive,
                    pressed && styles.rowPressed,
                  ]}
                >
                  {body}
                </Pressable>
              );
            }

            return (
              <View
                key={row.muscleGroup}
                style={styles.row}
                testID={rowTestId}
                accessibilityLabel={a11yLabel}
              >
                {body}
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.placeholder}>{emptyMessage}</Text>
      )}
      {showUnassigned ? (
        <Text
          style={styles.unassignedFooter}
          testID={`${testIdPrefix}-unassigned-footer`}
          accessibilityRole="text"
        >
          {formatUnassignedFooter(unassignedSetCount)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rowsWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
    paddingTop: 6,
    gap: 6,
  },
  row: {
    gap: 4,
    paddingVertical: 2,
  },
  rowInteractive: {
    paddingVertical: 6,
    borderRadius: 8,
    marginHorizontal: -6,
    paddingHorizontal: 6,
    minHeight: 44,
    justifyContent: "center",
  },
  rowPressed: {
    opacity: 0.75,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    minWidth: 0,
  },
  rowValueGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    flexShrink: 1,
  },
  rowValue: {
    flexShrink: 1,
  },
  rowChevron: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
    flexShrink: 0,
  },
  placeholder: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
    paddingVertical: 2,
  },
  unassignedFooter: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
    marginTop: 8,
  },
});
