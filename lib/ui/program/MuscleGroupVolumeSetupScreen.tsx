// lib/ui/program/MuscleGroupVolumeSetupScreen.tsx
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { ProgramDesignMuscleGroup } from "@/lib/data/program/workoutProgramDesignTypes";
import type { ProgrammingSource } from "@/lib/data/program/programmingEngineTypes";
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

/** One generated muscle-group row (weekly sets are user-overridable via the stepper). */
export type MuscleGroupVolumeItem = {
  id: ProgramDesignMuscleGroup;
  label: string;
  /** Generated (or overridden) target sets per week. */
  weeklySets: number;
  frequencyPerWeek: number;
  repRange: string;
  rirTarget: string;
  source: ProgrammingSource;
};

export type MuscleGroupVolumeSetupScreenProps = {
  /** True once the program is generatable; false shows the completion hint instead of the list. */
  available: boolean;
  items: MuscleGroupVolumeItem[];
  totalWeeklySets: number;
  /** Hint shown when `available` is false (lists what still needs to be set). */
  missingHint: string;
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
 * Muscle Group Volume editor. Shows the engine-generated weekly sets per muscle (with frequency,
 * rep range, and RIR context) and keeps -/+ steppers so the user can personalize any group. Manual
 * edits are flagged "Edited" and persist across regeneration (see the store). When the program is
 * not yet generatable, a hint lists the remaining required inputs.
 */
export function MuscleGroupVolumeSetupScreen({
  available,
  items,
  totalWeeklySets,
  missingHint,
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
      {!available ? (
        <View style={styles.hintCard} testID="muscle-volume-empty-hint">
          <Text style={styles.hintTitle}>No program generated yet</Text>
          <Text style={styles.hintBody}>{missingHint}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.description}>
            Generated weekly sets per muscle group. Personalize any group with the -/+ controls.
          </Text>

          <View style={styles.summaryCard} testID="muscle-volume-summary">
            <Text style={styles.summaryTotal}>Total weekly sets: {totalWeeklySets}</Text>
          </View>

          <View style={styles.card} testID="muscle-volume-list-card">
            {items.map((item, index) => {
              const atMin = item.weeklySets <= MUSCLE_VOLUME_MIN_SETS;
              const atMax = item.weeklySets >= MUSCLE_VOLUME_MAX_SETS;
              const isSet = item.weeklySets > 0;
              const detail = isSet
                ? `${item.frequencyPerWeek}×/wk · ${item.repRange} reps · RIR ${item.rirTarget}`
                : "Not programmed";
              return (
                <View
                  key={item.id}
                  testID={`muscle-volume-row-${item.id}`}
                  style={[styles.row, index > 0 && styles.rowDivider]}
                  accessibilityLabel={`${item.label}, ${item.weeklySets} sets per week, ${detail}`}
                >
                  <View style={styles.rowText}>
                    <View style={styles.labelLine}>
                      <Text style={styles.label} numberOfLines={1}>
                        {item.label}
                      </Text>
                      {item.source === "manual" ? (
                        <Text style={styles.editedBadge} testID={`muscle-volume-edited-${item.id}`}>
                          Edited
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.detail} numberOfLines={1}>
                      {detail}
                    </Text>
                  </View>
                  <View style={styles.stepper}>
                    <StepperButton
                      kind="decrement"
                      label={`Decrease ${item.label} weekly sets`}
                      disabled={atMin}
                      onPress={() => onChange(item.id, clamp(item.weeklySets - MUSCLE_VOLUME_STEP_SETS))}
                    />
                    <Text style={[styles.value, isSet && styles.valueSet]}>{item.weeklySets}</Text>
                    <StepperButton
                      kind="increment"
                      label={`Increase ${item.label} weekly sets`}
                      disabled={atMax}
                      onPress={() => onChange(item.id, clamp(item.weeklySets + MUSCLE_VOLUME_STEP_SETS))}
                    />
                  </View>
                </View>
              );
            })}
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
  summaryCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 16,
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    paddingHorizontal: 16,
  },
  row: {
    minHeight: 64,
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
  rowText: {
    flex: 1,
    gap: 3,
  },
  labelLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    flexShrink: 1,
    fontSize: 16,
    color: UI_TEXT_PRIMARY,
  },
  editedBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: SYSTEM_ACCENT,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  detail: {
    fontSize: 13,
    color: UI_TEXT_MUTED,
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
