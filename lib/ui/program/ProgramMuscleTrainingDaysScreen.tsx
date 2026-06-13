// lib/ui/program/ProgramMuscleTrainingDaysScreen.tsx
// Multi-select training-day assignment for one muscle group.
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { ProgrammingSplitDay } from "@/lib/data/program/programmingEngineTypes";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_APP_SCREEN_BG,
  UI_GROUPED_CARD_RADIUS,
  UI_TAB_ROOT_INSET,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type ProgramMuscleTrainingDaysScreenProps = {
  muscleLabel: string;
  /** Max days this muscle can be assigned to (matches frequency). */
  maxSelections: number;
  days: ProgrammingSplitDay[];
  selectedDayIds: string[];
  onToggleDay: (dayId: string) => void;
};

export function ProgramMuscleTrainingDaysScreen({
  muscleLabel,
  maxSelections,
  days,
  selectedDayIds,
  onToggleDay,
}: ProgramMuscleTrainingDaysScreenProps): React.ReactElement {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  const selectedSet = new Set(selectedDayIds);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
      showsVerticalScrollIndicator={false}
      accessibilityLabel={`Training days for ${muscleLabel}`}
    >
      <Text style={styles.description}>
        Choose up to {maxSelections} training {maxSelections === 1 ? "day" : "days"} for{" "}
        {muscleLabel}. Rename days on the Weekly Split page.
      </Text>
      <View style={styles.card} testID="muscle-training-days-list">
        {days.map((day, index) => {
          const selected = selectedSet.has(day.id);
          const atMax = selectedDayIds.length >= maxSelections && !selected;
          return (
            <Pressable
              key={day.id}
              testID={`muscle-training-day-option-${day.id}`}
              onPress={() => onToggleDay(day.id)}
              disabled={atMax}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected, disabled: atMax }}
              accessibilityLabel={day.name}
              style={({ pressed }) => [
                styles.row,
                index > 0 && styles.rowDivider,
                pressed && !atMax && styles.rowPressed,
                atMax && styles.rowDisabled,
              ]}
            >
              <Text style={styles.rowLabel}>{day.name}</Text>
              {selected ? (
                <Ionicons name="checkmark" size={20} color={SYSTEM_ACCENT} />
              ) : (
                <View style={styles.checkSpacer} />
              )}
            </Pressable>
          );
        })}
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
    gap: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
    color: UI_TEXT_SECONDARY,
  },
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    paddingHorizontal: 16,
  },
  row: {
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
  rowDisabled: {
    opacity: 0.4,
  },
  rowLabel: {
    fontSize: 16,
    color: UI_TEXT_PRIMARY,
    flex: 1,
  },
  checkSpacer: {
    width: 20,
    height: 20,
  },
});
