// lib/ui/program/ProgramDayWorkoutScreen.tsx
// One training-split day's workout: assigned exercise slots with select/swap + move-to-another-day.
// Presentational only — navigation and store writes are delegated to the caller.
import React, { useCallback, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type {
  ProgramDayMoveTarget,
  ProgramDaySlot,
  ProgramDayWorkout,
} from "@/lib/data/program/programDayWorkoutTypes";
import type { ProgramDesignMuscleGroup } from "@/lib/data/program/workoutProgramDesignTypes";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_APP_SCREEN_BG,
  UI_GROUPED_CARD_RADIUS,
  UI_SURFACE_PRESSED,
  UI_TAB_ROOT_INSET,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type ProgramDayWorkoutScreenProps = {
  available: boolean;
  dayWorkout: ProgramDayWorkout | null;
  /** Candidate days for the move flow, including the current day (flagged). */
  moveTargets: ProgramDayMoveTarget[];
  missingHint: string;
  onSelectSlot: (muscleGroupId: ProgramDesignMuscleGroup, slotId: string) => void;
  onMoveSlot: (muscleGroupId: ProgramDesignMuscleGroup, slotId: string, dayId: string) => void;
};

function SlotRow({
  slot,
  onSelect,
  onMove,
}: {
  slot: ProgramDaySlot;
  onSelect: () => void;
  onMove: () => void;
}): React.ReactElement {
  const hasSelection = slot.selectedExerciseId != null;
  const intensity = `${slot.sets} sets · ${slot.repRange} reps · RIR ${slot.rirTarget} · RPE ${slot.rpeTarget}`;

  return (
    <View style={styles.slotRow} testID={`day-slot-${slot.slotId}`}>
      <View style={styles.slotText}>
        {hasSelection ? (
          <Text style={styles.slotName} numberOfLines={1}>
            {slot.selectedExerciseName}
          </Text>
        ) : (
          <Text style={styles.slotSelectLabel}>Select exercise</Text>
        )}
        <Text style={styles.slotMuscle} numberOfLines={1}>
          {slot.muscleLabel}
        </Text>
        <Text style={styles.slotDetail} numberOfLines={2}>
          {intensity}
        </Text>
      </View>
      <View style={styles.slotActions}>
        <Pressable
          testID={`day-slot-select-${slot.slotId}`}
          onPress={onSelect}
          accessibilityRole="button"
          accessibilityLabel={
            hasSelection ? `Swap ${slot.selectedExerciseName}` : `Select exercise for ${slot.muscleLabel}`
          }
          hitSlop={4}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
        >
          <Text style={styles.actionLabel}>{hasSelection ? "Swap" : "Select"}</Text>
        </Pressable>
        <Pressable
          testID={`day-slot-move-${slot.slotId}`}
          onPress={onMove}
          accessibilityRole="button"
          accessibilityLabel={`Move ${slot.muscleLabel} exercise to another day`}
          hitSlop={4}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
        >
          <Text style={styles.actionLabel}>Move</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Day workout page: headline totals + each assigned slot with Select/Swap and Move. Move opens a
 * sheet listing the other training days; choosing one delegates to the caller's store write.
 */
export function ProgramDayWorkoutScreen({
  available,
  dayWorkout,
  moveTargets,
  missingHint,
  onSelectSlot,
  onMoveSlot,
}: ProgramDayWorkoutScreenProps): React.ReactElement {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  const [movingSlot, setMovingSlot] = useState<ProgramDaySlot | null>(null);

  const closeMove = useCallback(() => setMovingSlot(null), []);
  const confirmMove = useCallback(
    (dayId: string) => {
      if (movingSlot == null) return;
      onMoveSlot(movingSlot.muscleGroupId, movingSlot.slotId, dayId);
      setMovingSlot(null);
    },
    [movingSlot, onMoveSlot],
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
      showsVerticalScrollIndicator={false}
      accessibilityLabel={dayWorkout != null ? `${dayWorkout.name} workout` : "Day workout"}
      testID="program-day-workout-screen"
    >
      {!available || dayWorkout == null ? (
        <View style={styles.hintCard} testID="day-workout-empty-hint">
          <Text style={styles.hintTitle}>No workout generated yet</Text>
          <Text style={styles.hintBody}>{missingHint}</Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard} testID="day-workout-summary">
            <Text style={styles.summaryName}>{dayWorkout.name}</Text>
            <Text style={styles.summaryTotals} testID="day-workout-totals">
              {dayWorkout.exerciseCount} {dayWorkout.exerciseCount === 1 ? "exercise" : "exercises"} ·{" "}
              {dayWorkout.totalSets} {dayWorkout.totalSets === 1 ? "set" : "sets"}
            </Text>
          </View>

          <View style={styles.card} testID="day-workout-slots-card">
            {dayWorkout.slots.length === 0 ? (
              <Text style={styles.emptySlots} testID="day-workout-no-slots">
                No exercises assigned to this day yet.
              </Text>
            ) : (
              dayWorkout.slots.map((slot, index) => (
                <View key={slot.slotId}>
                  {index > 0 ? <View style={styles.slotDivider} /> : null}
                  <SlotRow
                    slot={slot}
                    onSelect={() => onSelectSlot(slot.muscleGroupId, slot.slotId)}
                    onMove={() => setMovingSlot(slot)}
                  />
                </View>
              ))
            )}
          </View>
        </>
      )}

      <Modal
        visible={movingSlot != null}
        transparent
        animationType="fade"
        onRequestClose={closeMove}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeMove} testID="day-move-backdrop">
          <Pressable style={styles.sheet} testID="day-move-sheet">
            <Text style={styles.sheetTitle}>Move to another day</Text>
            {moveTargets.map((target) => (
              <Pressable
                key={target.dayId}
                testID={`day-move-target-${target.dayId}`}
                onPress={() => confirmMove(target.dayId)}
                accessibilityRole="button"
                accessibilityLabel={`Move to ${target.name}${target.isCurrent ? ", current day" : ""}`}
                disabled={target.isCurrent}
                style={({ pressed }) => [
                  styles.sheetRow,
                  pressed && !target.isCurrent && styles.sheetRowPressed,
                ]}
              >
                <Text
                  style={[styles.sheetRowLabel, target.isCurrent && styles.sheetRowLabelMuted]}
                >
                  {target.name}
                </Text>
                {target.isCurrent ? (
                  <Text style={styles.sheetCurrentTag}>Current</Text>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={UI_TEXT_MUTED} />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
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
  summaryCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 16,
    gap: 4,
  },
  summaryName: {
    fontSize: 20,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  summaryTotals: {
    fontSize: 14,
    color: UI_TEXT_SECONDARY,
  },
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 4,
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
    gap: 3,
    minWidth: 0,
  },
  slotName: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  slotSelectLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: SYSTEM_ACCENT,
  },
  slotMuscle: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
  slotDetail: {
    fontSize: 13,
    color: UI_TEXT_MUTED,
    lineHeight: 18,
  },
  slotActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  actionBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  actionBtnPressed: {
    opacity: 0.6,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: SYSTEM_ACCENT,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    ...elevatedCardSurfaceStyle,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 4,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    marginBottom: 8,
  },
  sheetRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  sheetRowPressed: {
    backgroundColor: UI_SURFACE_PRESSED,
  },
  sheetRowLabel: {
    fontSize: 16,
    color: UI_TEXT_PRIMARY,
  },
  sheetRowLabelMuted: {
    color: UI_TEXT_MUTED,
  },
  sheetCurrentTag: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_MUTED,
  },
});
