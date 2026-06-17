import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { NutritionDayMealEntry } from "@/lib/data/nutrition/nutritionDayMealEntries";
import type { NutritionLogMutationStatus } from "@/lib/hooks/useNutritionLogMutations";
import {
  formatTimeOfDay,
  timeFieldsFromIso,
  timeFieldsFromWheel,
  timeOfDayToIsoOnDay,
  timeWheelFromFields,
  type TimeWheelSelection,
} from "@/lib/nutrition/editNutritionLog";
import {
  MEAL_SLOT_EDIT_LABEL,
  MEAL_SLOT_EDIT_VALUES,
  normalizeMealSlotForEdit,
  type MealSlot,
  type MealSlotEdit,
} from "@/lib/nutrition/mealSlot";
import type { DayKey } from "@/lib/ui/calendar/types";
import { NutritionTimeWheelPicker } from "@/lib/ui/nutrition/NutritionTimeWheelPicker";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_OVERLAY,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

type Props = {
  visible: boolean;
  entry: NutritionDayMealEntry | null;
  dayKey: DayKey;
  status: NutritionLogMutationStatus;
  errorMessage: string | null;
  onClose: () => void;
  onSave: (args: { observedAtIso: string; mealSlot: MealSlot }) => void;
  onDelete: () => void;
};

export function NutritionLogEditSheet({
  visible,
  entry,
  dayKey,
  status,
  errorMessage,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [mealSlot, setMealSlot] = useState<MealSlotEdit>("meal2");
  const [timeWheel, setTimeWheel] = useState<TimeWheelSelection>(timeWheelFromFields(12, 0));
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [draftTimeWheel, setDraftTimeWheel] = useState<TimeWheelSelection>(timeWheelFromFields(12, 0));

  useEffect(() => {
    if (entry == null) return;
    setMealSlot(normalizeMealSlotForEdit(entry.mealSlot));
    const { hours24, minutes } = timeFieldsFromIso(entry.observedAt);
    const wheel = timeWheelFromFields(hours24, minutes);
    setTimeWheel(wheel);
    setDraftTimeWheel(wheel);
    setTimePickerOpen(false);
  }, [entry]);

  const working = status === "working";

  const timeLabel = useMemo(() => {
    const { hours24, minutes } = timeFieldsFromWheel(timeWheel);
    return formatTimeOfDay(hours24, minutes);
  }, [timeWheel]);

  const openTimePicker = () => {
    if (working) return;
    setDraftTimeWheel(timeWheel);
    setTimePickerOpen(true);
  };

  const confirmTimePicker = () => {
    setTimeWheel(draftTimeWheel);
    setTimePickerOpen(false);
  };

  const cancelTimePicker = () => {
    setTimePickerOpen(false);
  };

  const handleSave = useMemo(
    () => () => {
      const { hours24, minutes } = timeFieldsFromWheel(timeWheel);
      const observedAtIso = timeOfDayToIsoOnDay(dayKey, hours24, minutes);
      onSave({ observedAtIso, mealSlot });
    },
    [timeWheel, dayKey, mealSlot, onSave],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropPress}
          accessibilityRole="button"
          accessibilityLabel="Dismiss edit"
          onPress={working || timePickerOpen ? undefined : onClose}
        />
        <View style={styles.sheet} testID="nutrition-log-edit-sheet">
          <View style={styles.handle} />
          <Text style={styles.title} numberOfLines={2}>
            {entry?.title ?? "Edit meal"}
          </Text>

          <Text style={styles.label}>Meal</Text>
          <View style={styles.slotRow}>
            {MEAL_SLOT_EDIT_VALUES.map((slot) => {
              const selected = mealSlot === slot;
              return (
                <Pressable
                  key={slot}
                  onPress={() => setMealSlot(slot)}
                  disabled={working}
                  style={({ pressed }) => [
                    styles.slotChip,
                    selected && styles.slotChipSelected,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={MEAL_SLOT_EDIT_LABEL[slot]}
                  testID={`edit-meal-slot-${slot}`}
                >
                  <Text style={[styles.slotChipText, selected && styles.slotChipTextSelected]}>
                    {MEAL_SLOT_EDIT_LABEL[slot]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Time</Text>
          <Pressable
            onPress={openTimePicker}
            disabled={working}
            style={({ pressed }) => [styles.timeButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Logged time ${timeLabel}. Opens time picker.`}
            testID="edit-meal-time-button"
          >
            <Text style={styles.timeButtonText}>{timeLabel}</Text>
          </Pressable>

          {timePickerOpen ? (
            <View style={styles.timePickerBox} testID="edit-meal-time-picker">
              <NutritionTimeWheelPicker value={draftTimeWheel} onChange={setDraftTimeWheel} />
              <View style={styles.timePickerActions}>
                <Pressable
                  onPress={cancelTimePicker}
                  style={({ pressed }) => [styles.timePickerGhost, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel time change"
                  testID="edit-meal-time-cancel"
                >
                  <Text style={styles.timePickerGhostText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={confirmTimePicker}
                  style={({ pressed }) => [styles.timePickerDone, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm time"
                  testID="edit-meal-time-done"
                >
                  <Text style={styles.timePickerDoneText}>Done</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {errorMessage != null ? (
            <Text style={styles.errorText} accessibilityRole="alert" accessibilityLiveRegion="polite">
              {errorMessage}
            </Text>
          ) : null}

          <Pressable
            onPress={handleSave}
            disabled={working}
            style={({ pressed }) => [styles.primary, (pressed || working) && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Save meal changes"
            testID="edit-meal-save"
          >
            <Text style={styles.primaryText}>{working ? "Saving…" : "Save changes"}</Text>
          </Pressable>

          <Pressable
            onPress={onDelete}
            disabled={working}
            style={({ pressed }) => [styles.destructive, (pressed || working) && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Delete this meal"
            testID="edit-meal-delete"
          >
            <Text style={styles.destructiveText}>Delete meal</Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            disabled={working}
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            testID="edit-meal-cancel"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: UI_OVERLAY, justifyContent: "flex-end" },
  backdropPress: { flex: 1 },
  sheet: {
    backgroundColor: UI_CARD_SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
    gap: 12,
    maxHeight: "92%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: UI_BORDER_HAIRLINE,
    marginBottom: 4,
  },
  title: { fontSize: 20, fontWeight: "700", color: UI_TEXT_PRIMARY, letterSpacing: -0.3 },
  label: { fontSize: 15, fontWeight: "600", color: UI_TEXT_SECONDARY, marginTop: 4 },
  slotRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    justifyContent: "center",
  },
  slotChipSelected: { borderColor: SYSTEM_ACCENT, backgroundColor: "rgba(10, 132, 255, 0.14)" },
  slotChipText: { fontSize: 15, fontWeight: "600", color: UI_TEXT_SECONDARY },
  slotChipTextSelected: { color: SYSTEM_ACCENT },
  timeButton: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  timeButtonText: { fontSize: 17, fontWeight: "600", color: UI_TEXT_PRIMARY },
  timePickerBox: {
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  timePickerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  timePickerGhost: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  timePickerGhostText: { fontSize: 16, fontWeight: "600", color: UI_TEXT_SECONDARY },
  timePickerDone: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: SYSTEM_ACCENT,
    justifyContent: "center",
    alignItems: "center",
  },
  timePickerDoneText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  errorText: { fontSize: 14, color: "#FF6961", lineHeight: 20 },
  primary: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  destructive: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 69, 58, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  destructiveText: { color: "#FF6961", fontSize: 17, fontWeight: "600" },
  cancel: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  cancelText: { color: UI_TEXT_SECONDARY, fontSize: 16, fontWeight: "500" },
  pressed: { opacity: 0.65 },
});
