// lib/ui/program/MuscleGroupVolumeSetupScreen.tsx
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { ProgramDesignMuscleGroup } from "@/lib/data/program/workoutProgramDesignTypes";
import {
  MUSCLE_VOLUME_MAX_SETS,
  MUSCLE_VOLUME_MIN_SETS,
  MUSCLE_VOLUME_STEP_SETS,
} from "@/lib/data/program/workoutProgramDesignOptions";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_14 } from "@/lib/ui/theme/systemAccent";
import {
  UI_APP_SCREEN_BG,
  UI_GROUPED_CARD_RADIUS,
  UI_SURFACE_PRESSED,
  UI_TAB_ROOT_INSET,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type MuscleGroupVolumeItem = {
  id: ProgramDesignMuscleGroup;
  label: string;
  /** Target sets per week (0 means "Not set"). */
  value: number;
};

export type MuscleGroupVolumeSetupScreenProps = {
  items: MuscleGroupVolumeItem[];
  onChange: (id: ProgramDesignMuscleGroup, nextValue: number) => void;
};

function clamp(value: number): number {
  if (value < MUSCLE_VOLUME_MIN_SETS) return MUSCLE_VOLUME_MIN_SETS;
  if (value > MUSCLE_VOLUME_MAX_SETS) return MUSCLE_VOLUME_MAX_SETS;
  return value;
}

function StepperButton({
  kind,
  label,
  disabled,
  onPress,
}: {
  kind: "decrement" | "increment";
  label: string;
  disabled: boolean;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.stepBtn,
        disabled && styles.stepBtnDisabled,
        pressed && !disabled && styles.stepBtnPressed,
      ]}
    >
      <Ionicons
        name={kind === "increment" ? "add" : "remove"}
        size={20}
        color={disabled ? UI_TEXT_MUTED : SYSTEM_ACCENT}
      />
    </Pressable>
  );
}

/**
 * Per-muscle weekly volume editor. A scrollable grouped list of stepper rows — scales cleanly
 * to all 20 muscle groups without crowding. Each row exposes its own value via an a11y label
 * and ≥44pt stepper controls.
 */
export function MuscleGroupVolumeSetupScreen({
  items,
  onChange,
}: MuscleGroupVolumeSetupScreenProps): React.ReactElement {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="Muscle Group Volume"
    >
      <Text style={styles.description}>
        Set your target weekly working sets for each muscle group. Leave a group at 0 to skip it.
      </Text>
      <View style={styles.card}>
        {items.map((item, index) => {
          const atMin = item.value <= MUSCLE_VOLUME_MIN_SETS;
          const atMax = item.value >= MUSCLE_VOLUME_MAX_SETS;
          const isSet = item.value > 0;
          return (
            <View
              key={item.id}
              testID={`muscle-volume-row-${item.id}`}
              style={[styles.row, index > 0 && styles.rowDivider]}
              accessibilityLabel={`${item.label}, ${item.value} sets per week`}
            >
              <Text style={styles.label} numberOfLines={1}>
                {item.label}
              </Text>
              <View style={styles.stepper}>
                <StepperButton
                  kind="decrement"
                  label={`Decrease ${item.label} sets`}
                  disabled={atMin}
                  onPress={() => onChange(item.id, clamp(item.value - MUSCLE_VOLUME_STEP_SETS))}
                />
                <Text style={[styles.value, isSet && styles.valueSet]}>{item.value}</Text>
                <StepperButton
                  kind="increment"
                  label={`Increase ${item.label} sets`}
                  disabled={atMax}
                  onPress={() => onChange(item.id, clamp(item.value + MUSCLE_VOLUME_STEP_SETS))}
                />
              </View>
            </View>
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
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
    color: UI_TEXT_SECONDARY,
    marginBottom: 14,
  },
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    paddingHorizontal: 16,
  },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: UI_TEXT_PRIMARY,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SYSTEM_ACCENT_FILL_14,
  },
  stepBtnDisabled: {
    backgroundColor: UI_SURFACE_PRESSED,
  },
  stepBtnPressed: {
    opacity: 0.7,
  },
  value: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: UI_TEXT_MUTED,
  },
  valueSet: {
    color: UI_TEXT_PRIMARY,
  },
});
