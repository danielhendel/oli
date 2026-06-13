// lib/ui/program/MuscleGroupExercisesSetupScreen.tsx
// Per-muscle-group exercise plan: editable metric rows + empty/selectable exercise slots.
// Presentational only — navigation and store writes are delegated to the caller.
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { ProgramMuscleGroupExercisePlan } from "@/lib/data/program/programExerciseRecommendationTypes";
import type { ProgramMuscleMetric } from "@/lib/data/program/workoutProgramDesignOptions";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_APP_SCREEN_BG,
  UI_GROUPED_CARD_RADIUS,
  UI_TAB_ROOT_INSET,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type MuscleGroupExercisesSetupScreenProps = {
  available: boolean;
  plan: ProgramMuscleGroupExercisePlan | null;
  missingHint: string;
  onEditMetric: (metric: ProgramMuscleMetric) => void;
  onSelectSlot: (slotId: string) => void;
};

function MetricRow({
  label,
  value,
  showDivider,
  onPress,
  testID,
}: {
  label: string;
  value: string;
  showDivider: boolean;
  onPress: () => void;
  testID: string;
}): React.ReactElement {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}. Double tap to edit`}
      hitSlop={4}
      style={({ pressed }) => [
        styles.metricRow,
        showDivider && styles.rowDivider,
        pressed && styles.rowPressed,
      ]}
    >
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.valueWrap}>
        <Text style={styles.metricValue} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={UI_TEXT_MUTED} />
      </View>
    </Pressable>
  );
}

function ExerciseSlotRow({
  slot,
  onSelect,
}: {
  slot: ProgramMuscleGroupExercisePlan["slots"][number];
  onSelect: () => void;
}): React.ReactElement {
  const hasSelection = slot.selectedExerciseId != null;
  const detail = `${slot.sets} sets · ${slot.repRange} reps · RIR ${slot.rirTarget} · RPE ${slot.rpeTarget}`;
  const daySuffix = slot.dayName != null ? ` · ${slot.dayName}` : "";

  return (
    <View
      style={styles.slotRow}
      testID={`muscle-exercise-slot-${slot.slotId}`}
      accessibilityLabel={
        hasSelection
          ? `${slot.selectedExerciseName}, ${slot.sets} sets`
          : `Select exercise, ${detail}${daySuffix}`
      }
    >
      <View style={styles.slotText}>
        {hasSelection ? (
          <>
            <Text style={styles.slotExerciseName} numberOfLines={1}>
              {slot.selectedExerciseName}
            </Text>
            <Text style={styles.slotDetail} numberOfLines={1}>
              {slot.sets} sets{daySuffix}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.slotSelectLabel}>Select exercise</Text>
            <Text style={styles.slotDetail} numberOfLines={2}>
              {detail}
              {daySuffix}
            </Text>
          </>
        )}
      </View>
      <Pressable
        testID={`muscle-exercise-select-${slot.slotId}`}
        onPress={onSelect}
        accessibilityRole="button"
        accessibilityLabel={
          hasSelection ? `Swap ${slot.selectedExerciseName}` : "Select exercise"
        }
        hitSlop={4}
        style={({ pressed }) => [styles.selectBtn, pressed && styles.selectBtnPressed]}
      >
        <Text style={styles.selectBtnLabel}>{hasSelection ? "Swap" : "Select"}</Text>
        <Ionicons name="chevron-forward" size={16} color={SYSTEM_ACCENT} />
      </Pressable>
    </View>
  );
}

/**
 * Exercise plan page for one muscle group. Shows editable metric rows (weekly set target,
 * frequency, number of exercises, training days) and empty/selectable exercise slots. The engine
 * guides structure; the user chooses exercises from the library on a separate selection page.
 */
export function MuscleGroupExercisesSetupScreen({
  available,
  plan,
  missingHint,
  onEditMetric,
  onSelectSlot,
}: MuscleGroupExercisesSetupScreenProps): React.ReactElement {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);

  const trainingDaysValue =
    plan != null && plan.trainingDayNames.length > 0
      ? plan.trainingDayNames.join(", ")
      : "Not assigned";

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
      showsVerticalScrollIndicator={false}
      accessibilityLabel={plan != null ? `${plan.label} exercises` : "Muscle group exercises"}
    >
      {!available || plan == null ? (
        <View style={styles.hintCard} testID="muscle-exercises-empty-hint">
          <Text style={styles.hintTitle}>No program generated yet</Text>
          <Text style={styles.hintBody}>{missingHint}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.description}>
            Structure for {plan.label}. Adjust the metrics below, then choose exercises for each
            slot from the library.
          </Text>

          <View style={styles.card} testID="muscle-exercises-metrics-card">
            <MetricRow
              label="Weekly set target"
              value={String(plan.settings.weeklySetTarget)}
              showDivider={false}
              onPress={() => onEditMetric("weekly-set-target")}
              testID="muscle-metric-weekly-set-target"
            />
            <MetricRow
              label="Frequency"
              value={`${plan.settings.frequencyPerWeek}× per week`}
              showDivider
              onPress={() => onEditMetric("frequency")}
              testID="muscle-metric-frequency"
            />
            <MetricRow
              label="Number of exercises"
              value={String(plan.settings.exerciseCount)}
              showDivider
              onPress={() => onEditMetric("exercise-count")}
              testID="muscle-metric-exercise-count"
            />
            <MetricRow
              label="Training days"
              value={trainingDaysValue}
              showDivider
              onPress={() => onEditMetric("training-days")}
              testID="muscle-metric-training-days"
            />
          </View>

          {plan.libraryExpansionNeeded ? (
            <View style={styles.expansionBanner} testID="muscle-exercises-expansion-hint">
              <Text style={styles.expansionText}>
                Fewer than 5 exercises target this muscle group in the library. Showing all
                available options when you select.
              </Text>
            </View>
          ) : null}

          <View style={styles.card} testID="muscle-exercises-slots-card">
            {plan.slots.length === 0 ? (
              <Text style={styles.emptySlots} testID="muscle-exercises-no-slots">
                No exercise slots — weekly set target is 0.
              </Text>
            ) : (
              plan.slots.map((slot, index) => (
                <View key={slot.slotId}>
                  {index > 0 ? <View style={styles.slotDivider} /> : null}
                  <ExerciseSlotRow slot={slot} onSelect={() => onSelectSlot(slot.slotId)} />
                </View>
              ))
            )}
          </View>
        </>
      )}
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
    gap: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
    color: UI_TEXT_SECONDARY,
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
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  metricRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  rowPressed: {
    opacity: 0.6,
  },
  metricLabel: {
    fontSize: 15,
    color: UI_TEXT_SECONDARY,
    flexShrink: 1,
  },
  valueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
    justifyContent: "flex-end",
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    flexShrink: 1,
    textAlign: "right",
  },
  expansionBanner: {
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  expansionText: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_MUTED,
  },
  emptySlots: {
    fontSize: 15,
    color: UI_TEXT_MUTED,
    paddingVertical: 16,
  },
  slotRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
  },
  slotDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  slotText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  slotSelectLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: SYSTEM_ACCENT,
  },
  slotExerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  slotDetail: {
    fontSize: 13,
    color: UI_TEXT_MUTED,
    lineHeight: 18,
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 44,
    paddingHorizontal: 8,
  },
  selectBtnPressed: {
    opacity: 0.6,
  },
  selectBtnLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: SYSTEM_ACCENT,
  },
});
