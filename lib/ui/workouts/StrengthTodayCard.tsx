import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { StrengthTodayCardModel } from "@/lib/data/workouts/strengthTodayCardModel";
import { STRENGTH_TODAY_WORKING_VOLUME_TITLE } from "@/lib/data/workouts/strengthTodayCardModel";
import type { WorkoutDetailMuscleExerciseSetCountRow } from "@/lib/data/workouts/workoutDetailMuscleVolume";
import {
  WORKOUT_DETAIL_MUSCLE_GROUP_LABELS,
  type WorkoutDetailMuscleSetCountRow,
} from "@/lib/data/workouts/workoutDetailMuscleVolume";
import { formatCompletedSetsLabel } from "@/lib/data/workouts/workoutDisplay";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  RECENT_WORKOUT_ROW_META_TEXT_STYLE,
  workoutOverviewInCardHeaderStyles,
} from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import type { MuscleGroup } from "@/lib/workouts/exercises/taxonomy";

import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_SCREEN_BG,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type StrengthTodayMuscleGroupSelection = {
  muscleGroup: MuscleGroup;
  label: string;
  totalSetCount: number;
  exercises: readonly WorkoutDetailMuscleExerciseSetCountRow[];
};

export type StrengthTodayCardProps = {
  loading: boolean;
  model: StrengthTodayCardModel | null;
  onPressLog?: () => void;
  /** Fired when a muscle row is tapped (full-row pressable). */
  onSelectMuscleGroup?: (selection: StrengthTodayMuscleGroupSelection) => void;
  testID?: string;
};

function pillColors(pill: "Completed" | "Rest"): { bg: string; fg: string } {
  if (pill === "Completed") return { bg: "rgba(52, 199, 89, 0.09)", fg: "#2D9D4E" };
  return { bg: UI_SCREEN_BG, fg: UI_TEXT_SECONDARY };
}

function logCtaLabel(loading: boolean, model: StrengthTodayCardModel | null): string {
  if (loading || model == null) return "Log Workout →";
  return model.kind === "completed" ? "Log Another →" : "Log Workout →";
}

function logCtaAccessibilityLabel(loading: boolean, model: StrengthTodayCardModel | null): string {
  if (loading || model == null) return "Log strength workout";
  return model.kind === "completed" ? "Log another strength workout" : "Log strength workout";
}

export function StrengthTodayCard({
  loading,
  model,
  onPressLog,
  onSelectMuscleGroup,
  testID = "strength-today-card",
}: StrengthTodayCardProps) {
  const rootA11y =
    loading || model == null
      ? "Today strength summary. Loading."
      : model.kind === "completed"
        ? `Today. ${model.pill}. ${model.primaryTitle}. ${model.durationLabel}.${model.subtitle.trim() ? ` ${model.subtitle}.` : ""}${model.workingVolume != null ? ` ${STRENGTH_TODAY_WORKING_VOLUME_TITLE} by muscle group.` : ""}`
        : `Today. ${model.pill}. ${model.primaryTitle}. ${model.subtitle}`;

  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel={rootA11y}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>Today</Text>
        {!loading && model != null ? (
          <View style={[styles.pill, { backgroundColor: pillColors(model.pill).bg }]}>
            <Text style={[styles.pillLabel, { color: pillColors(model.pill).fg }]}>{model.pill}</Text>
          </View>
        ) : null}
        <View style={styles.titleRowSpacer} />
        {onPressLog != null ? (
          <Pressable
            onPress={onPressLog}
            accessibilityRole="button"
            accessibilityLabel={logCtaAccessibilityLabel(loading, model)}
            hitSlop={8}
            style={({ pressed }) => [
              workoutOverviewInCardHeaderStyles.linkHit,
              styles.logLinkHit,
              pressed && workoutOverviewInCardHeaderStyles.linkPressed,
            ]}
            testID="strength-today-card-log-link"
          >
            <Text style={workoutOverviewInCardHeaderStyles.link}>{logCtaLabel(loading, model)}</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? <LoadingState variant="inline" message="Loading workouts…" /> : null}

      {!loading && model != null && model.kind === "completed" ? (
        <View style={styles.body}>
          <View style={styles.mainBlock}>
            <View style={styles.titleDurationRow}>
              <Text style={styles.primaryHeadline} numberOfLines={3}>
                {model.primaryTitle}
              </Text>
              <Text
                style={styles.durationFigure}
                numberOfLines={1}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {model.durationLabel}
              </Text>
            </View>
            {model.subtitle.trim().length > 0 ? (
              <Text style={styles.sessionSummaryLine} numberOfLines={2}>
                {model.subtitle}
              </Text>
            ) : null}
          </View>
          {model.workingVolume != null ? (
            <StrengthTodayWorkingVolumeRows
              rows={model.workingVolume.rows}
              exercisesByMuscleGroup={model.workingVolume.exercisesByMuscleGroup}
              onSelectMuscleGroup={onSelectMuscleGroup}
            />
          ) : null}
        </View>
      ) : null}

      {!loading && model != null && model.kind === "rest" ? (
        <View style={styles.body}>
          <Text style={styles.primaryHeadline} numberOfLines={2}>
            {model.primaryTitle}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

type WorkingVolumeRowsProps = {
  rows: readonly WorkoutDetailMuscleSetCountRow[];
  exercisesByMuscleGroup: Partial<Record<MuscleGroup, readonly WorkoutDetailMuscleExerciseSetCountRow[]>>;
  onSelectMuscleGroup: ((selection: StrengthTodayMuscleGroupSelection) => void) | undefined;
};

function StrengthTodayWorkingVolumeRows({
  rows,
  exercisesByMuscleGroup,
  onSelectMuscleGroup,
}: WorkingVolumeRowsProps): React.ReactElement | null {
  const handlePress = useCallback(
    (row: WorkoutDetailMuscleSetCountRow) => {
      if (onSelectMuscleGroup == null) return;
      onSelectMuscleGroup({
        muscleGroup: row.muscleGroup,
        label: WORKOUT_DETAIL_MUSCLE_GROUP_LABELS[row.muscleGroup],
        totalSetCount: row.setCount,
        exercises: exercisesByMuscleGroup[row.muscleGroup] ?? [],
      });
    },
    [exercisesByMuscleGroup, onSelectMuscleGroup],
  );

  if (rows.length === 0) return null;

  return (
    <View
      style={styles.workingVolumeBlock}
      testID="strength-today-working-volume"
      accessibilityRole="list"
    >
      {rows.map((row) => {
        const label = WORKOUT_DETAIL_MUSCLE_GROUP_LABELS[row.muscleGroup];
        const setsLabel = formatCompletedSetsLabel(row.setCount);
        return (
          <Pressable
            key={row.muscleGroup}
            onPress={() => handlePress(row)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${label} working volume breakdown, ${setsLabel}`}
            testID={`strength-today-working-volume-${row.muscleGroup}`}
            style={({ pressed }) => [styles.muscleRowPressable, pressed && styles.muscleRowPressed]}
          >
            <View style={styles.muscleRowInner}>
              <Text style={[dashMetricRowLabelTextStyle, styles.muscleRowLabel]} numberOfLines={1}>
                {label}
              </Text>
              <View style={styles.muscleRowRight}>
                <Text
                  style={dashMetricRowValueTextStyle}
                  numberOfLines={1}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  {setsLabel}
                </Text>
                <Text
                  style={styles.muscleRowChevron}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  {"\u203A"}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 7,
    ...elevatedCardSurfaceStyle,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },
  cardTitle: {
    ...strengthMetricCardTitleTextStyle,
  },
  pill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    alignSelf: "center",
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: -0.06,
  },
  titleRowSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 8,
  },
  logLinkHit: {
    minHeight: 44,
    justifyContent: "center",
  },
  body: {
    gap: 0,
  },
  /** Title + duration row, then summary — 5px between (matches This Week title→meta rhythm). */
  mainBlock: {
    gap: 5,
  },
  /** Compact Daily-Energy-style rows, attached to the summary via a top hairline. */
  workingVolumeBlock: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
    paddingTop: 6,
    gap: 2,
  },
  muscleRowPressable: {
    borderRadius: 8,
    marginHorizontal: -6,
    paddingHorizontal: 6,
    paddingVertical: 7,
    minHeight: 44,
    justifyContent: "center",
  },
  muscleRowPressed: {
    opacity: 0.75,
  },
  muscleRowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  muscleRowLabel: {
    flex: 1,
    minWidth: 0,
  },
  muscleRowRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    flexShrink: 1,
  },
  muscleRowChevron: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
    flexShrink: 0,
  },
  titleDurationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  primaryHeadline: {
    flex: 1,
    minWidth: 0,
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.28,
    lineHeight: 21,
  },
  durationFigure: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.38,
    flexShrink: 0,
    textAlign: "right",
    paddingTop: 0,
  },
  sessionSummaryLine: {
    ...RECENT_WORKOUT_ROW_META_TEXT_STYLE,
    lineHeight: 18,
  },
});
