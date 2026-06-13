// lib/ui/program/GeneratedProgramCards.tsx
// The generated program, rendered as three separate collapsible cards (no nested "card in a card"):
//   1. Program Overview — headline prescription (sets, frequency, rep range, RIR, RPE, progression).
//      Each row is tappable and opens a near-full-page coach explainer sheet.
//   2. Muscle Group Volume — generated weekly set targets + an edit entry point
//   3. Weekly Split — generated split distribution + an edit entry point
// Presentational only; navigation is delegated to the caller.
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { getSelectedExercisesForMuscleGroup } from "@/lib/data/program/buildProgramExerciseRecommendations";
import { buildProgramDayWorkouts } from "@/lib/data/program/buildProgramDayWorkouts";
import type { ProgrammingPrescription } from "@/lib/data/program/programmingEngineTypes";
import type {
  ExerciseSelectionOverrideMap,
  ProgramDesignMuscleGroup,
  MuscleGroupVolumeMap,
  SlotDayOverrideMap,
} from "@/lib/data/program/workoutProgramDesignTypes";
import {
  buildProgramOverviewMetrics,
  type ProgramMetricExplainer,
  type ProgramOverviewMetric,
  type ProgramOverviewMetricId,
} from "@/lib/data/program/programOverviewMetricExplainers";
import { CollapsibleCard } from "@/lib/ui/program/CollapsibleCard";
import {
  MetricDetailsSheet,
  type MetricDetailsSection,
} from "@/lib/ui/common/MetricDetailsSheet";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

/** Draft exercise-plan overrides needed to render selected exercises on the Muscle Group Volume card. */
export type MuscleExercisePlanContext = {
  exerciseCountOverrides: MuscleGroupVolumeMap;
  exerciseSelectionOverrides: ExerciseSelectionOverrideMap;
  trainingDayOverrides: Partial<Record<ProgramDesignMuscleGroup, string[]>>;
  slotDayOverrides: SlotDayOverrideMap;
};

export type GeneratedProgramCardsProps = {
  prescription: ProgrammingPrescription;
  /** Exercise selections + overrides from the program draft (for muscle card sub-rows). */
  muscleExerciseContext: MuscleExercisePlanContext;
  onOpenMuscleVolume: () => void;
  onOpenWeeklySplit: () => void;
  /** Open the per-muscle-group exercise selection page. */
  onOpenMuscleExercises: (muscleGroupId: ProgramDesignMuscleGroup) => void;
  /** Open the day workout page for one training-split day. */
  onOpenDay: (dayId: string) => void;
  /** Optional hook when a Program Overview metric row is opened (e.g. tests, analytics). */
  onOpenOverviewMetric?: (metric: ProgramOverviewMetric) => void;
  /** Pre-open a Program Overview explainer sheet (tests / deep links). */
  initialActiveMetricId?: ProgramOverviewMetricId;
};

/** Maps the structured explainer to ordered, labelled sheet sections. */
function buildExplainerSections(explainer: ProgramMetricExplainer): MetricDetailsSection[] {
  return [
    { heading: "What this is", body: explainer.whatIsIt },
    { heading: "Why it matters", body: explainer.whyItMatters },
    { heading: "What your value means", body: explainer.whatYourValueMeans },
    { heading: "How to use this", body: explainer.howToUseIt },
    { heading: "What to watch next", body: explainer.whatToWatchNext },
  ];
}

/** Indented sub-row under a muscle group showing a user-selected exercise + allocated sets. */
function MuscleExerciseSubRow({
  name,
  sets,
  testID,
}: {
  name: string;
  sets: number;
  testID: string;
}): React.ReactElement {
  return (
    <View style={styles.exerciseSubRow} testID={testID} accessibilityLabel={`${name}, ${sets} sets`}>
      <Text style={styles.exerciseSubName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.exerciseSubSets}>{sets} sets</Text>
    </View>
  );
}

/**
 * Muscle Group Volume row: muscle label on the left, weekly sets + chevron on the right. Tapping
 * opens that muscle group's exercise selection page. ≥44pt tap target, button role/label.
 */
function MuscleGroupRow({
  label,
  weeklySets,
  showDivider,
  onPress,
  testID,
}: {
  label: string;
  weeklySets: number;
  showDivider: boolean;
  onPress: () => void;
  testID: string;
}): React.ReactElement {
  const value = `${weeklySets} ${weeklySets === 1 ? "set" : "sets"}`;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${label} exercises. ${value} per week`}
      hitSlop={4}
      style={({ pressed }) => [
        styles.statRow,
        showDivider && styles.rowDivider,
        pressed && styles.rowPressed,
      ]}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.valueWrap}>
        <Text style={styles.statValue} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={UI_TEXT_MUTED} />
      </View>
    </Pressable>
  );
}

/**
 * Program Overview row: label on the left, generated value + chevron on the right. Tapping opens
 * the coach explainer sheet for that metric. ≥44pt tap target, button role/label.
 */
function OverviewMetricRow({
  metric,
  showDivider,
  onPress,
  testID,
}: {
  metric: ProgramOverviewMetric;
  showDivider: boolean;
  onPress: (metricId: ProgramOverviewMetricId) => void;
  testID: string;
}): React.ReactElement {
  return (
    <Pressable
      testID={testID}
      onPress={() => onPress(metric.id)}
      accessibilityRole="button"
      accessibilityLabel={`${metric.label}, ${metric.value}. Double tap to learn more`}
      hitSlop={4}
      style={({ pressed }) => [
        styles.statRow,
        showDivider && styles.rowDivider,
        pressed && styles.rowPressed,
      ]}
    >
      <Text style={styles.statLabel}>{metric.label}</Text>
      <View style={styles.valueWrap}>
        <Text style={styles.statValue} numberOfLines={1}>
          {metric.value}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={UI_TEXT_MUTED} />
      </View>
    </Pressable>
  );
}

/**
 * Weekly Split day row: day name on the left, "N exercises · M sets" + chevron on the right. Tapping
 * opens that day's workout page. ≥44pt tap target, button role/label.
 */
function DayRow({
  name,
  exerciseCount,
  totalSets,
  showDivider,
  onPress,
  testID,
}: {
  name: string;
  exerciseCount: number;
  totalSets: number;
  showDivider: boolean;
  onPress: () => void;
  testID: string;
}): React.ReactElement {
  const summary =
    exerciseCount > 0
      ? `${exerciseCount} ${exerciseCount === 1 ? "exercise" : "exercises"} · ${totalSets} ${totalSets === 1 ? "set" : "sets"}`
      : "Rest day";
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${name} workout. ${summary}`}
      hitSlop={4}
      style={({ pressed }) => [
        styles.statRow,
        showDivider && styles.rowDivider,
        pressed && styles.rowPressed,
      ]}
    >
      <Text style={styles.statLabel}>{name}</Text>
      <View style={styles.valueWrap}>
        <Text style={styles.daySummary} numberOfLines={1}>
          {summary}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={UI_TEXT_MUTED} />
      </View>
    </Pressable>
  );
}

function EditRow({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID: string;
}): React.ReactElement {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [styles.editRow, styles.rowDivider, pressed && styles.editRowPressed]}
    >
      <Text style={styles.editLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={UI_TEXT_MUTED} />
    </Pressable>
  );
}

export function GeneratedProgramCards({
  prescription,
  muscleExerciseContext,
  onOpenMuscleVolume,
  onOpenWeeklySplit,
  onOpenMuscleExercises,
  onOpenDay,
  onOpenOverviewMetric,
  initialActiveMetricId,
}: GeneratedProgramCardsProps): React.ReactElement {
  const trained = prescription.muscles.filter((m) => m.weeklySets > 0);
  const splitSummary = prescription.weeklySplit.days.map((d) => d.name).join(" · ");
  const overviewMetrics = buildProgramOverviewMetrics(prescription);
  const dayWorkouts = buildProgramDayWorkouts({
    prescription,
    exerciseCountOverrides: muscleExerciseContext.exerciseCountOverrides,
    trainingDayOverrides: muscleExerciseContext.trainingDayOverrides,
    exerciseSelectionOverrides: muscleExerciseContext.exerciseSelectionOverrides,
    slotDayOverrides: muscleExerciseContext.slotDayOverrides,
  });

  const [activeMetric, setActiveMetric] = useState<ProgramOverviewMetric | null>(() => {
    if (!initialActiveMetricId) return null;
    return overviewMetrics.find((m) => m.id === initialActiveMetricId) ?? null;
  });
  const openMetric = useCallback(
    (metricId: ProgramOverviewMetricId) => {
      const metric = overviewMetrics.find((m) => m.id === metricId);
      if (!metric) return;
      setActiveMetric(metric);
      onOpenOverviewMetric?.(metric);
    },
    [overviewMetrics, onOpenOverviewMetric],
  );
  const closeMetric = useCallback(() => setActiveMetric(null), []);

  return (
    <View style={styles.stack} testID="generated-program-cards">
      <CollapsibleCard
        title="Program Overview"
        summary="Volume, intensity, and progression targets"
        defaultExpanded
        testID="generated-overview-card"
      >
        {overviewMetrics.map((metric, index) => (
          <OverviewMetricRow
            key={metric.id}
            metric={metric}
            showDivider={index > 0}
            onPress={openMetric}
            testID={`overview-stat-${metric.id}`}
          />
        ))}
      </CollapsibleCard>

      <CollapsibleCard
        title="Muscle Group Volume"
        summary={`${trained.length} groups · ${prescription.totalWeeklySets} sets/week`}
        testID="generated-muscle-volume-card"
      >
        {trained.map((muscle, index) => {
          const selectedExercises = getSelectedExercisesForMuscleGroup({
            prescription,
            muscleGroupId: muscle.muscleGroupId,
            exerciseCountOverride:
              muscleExerciseContext.exerciseCountOverrides[muscle.muscleGroupId],
            trainingDayOverride: muscleExerciseContext.trainingDayOverrides[muscle.muscleGroupId],
            selections: muscleExerciseContext.exerciseSelectionOverrides,
          });
          return (
            <View key={muscle.muscleGroupId}>
              <MuscleGroupRow
                label={muscle.label}
                weeklySets={muscle.weeklySets}
                showDivider={index > 0}
                onPress={() => onOpenMuscleExercises(muscle.muscleGroupId)}
                testID={`generated-muscle-${muscle.muscleGroupId}`}
              />
              {selectedExercises.map((exercise) => (
                <MuscleExerciseSubRow
                  key={exercise.slotId}
                  name={exercise.name}
                  sets={exercise.sets}
                  testID={`generated-muscle-exercise-${muscle.muscleGroupId}-${exercise.exerciseId}`}
                />
              ))}
            </View>
          );
        })}
        <EditRow
          label="Edit muscle group volume"
          onPress={onOpenMuscleVolume}
          testID="generated-open-muscle-volume"
        />
      </CollapsibleCard>

      <CollapsibleCard
        title="Weekly Split"
        summary={splitSummary || `${prescription.weeklySplit.dayCount} days`}
        testID="generated-weekly-split-card"
      >
        {dayWorkouts.map((day, index) => (
          <DayRow
            key={day.dayId}
            name={day.name}
            exerciseCount={day.exerciseCount}
            totalSets={day.totalSets}
            showDivider={index > 0}
            onPress={() => onOpenDay(day.dayId)}
            testID={`generated-split-${day.dayId}`}
          />
        ))}
        <EditRow
          label="Edit weekly split"
          onPress={onOpenWeeklySplit}
          testID="generated-open-weekly-split"
        />
      </CollapsibleCard>

      <MetricDetailsSheet
        visible={activeMetric != null}
        onClose={closeMetric}
        title={activeMetric?.explainer.title ?? ""}
        value={activeMetric?.explainer.currentValue ?? ""}
        sections={activeMetric ? buildExplainerSections(activeMetric.explainer) : []}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  statRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.6,
  },
  valueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
    justifyContent: "flex-end",
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  statLabel: {
    fontSize: 15,
    color: UI_TEXT_SECONDARY,
    flexShrink: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    flexShrink: 1,
    textAlign: "right",
  },
  daySummary: {
    fontSize: 14,
    color: UI_TEXT_SECONDARY,
    flexShrink: 1,
    textAlign: "right",
  },
  editRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  editRowPressed: {
    opacity: 0.6,
  },
  editLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: SYSTEM_ACCENT,
  },
  exerciseSubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingLeft: 16,
    paddingRight: 34,
    paddingVertical: 6,
    minHeight: 32,
  },
  exerciseSubName: {
    flex: 1,
    fontSize: 14,
    color: UI_TEXT_SECONDARY,
  },
  exerciseSubSets: {
    fontSize: 14,
    fontWeight: "600",
    color: UI_TEXT_MUTED,
    flexShrink: 0,
  },
});
