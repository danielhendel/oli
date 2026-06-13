// lib/ui/program/ProgramMuscleNumberEditScreen.tsx
// Generic numeric stepper for editing a single muscle-group metric (weekly sets, frequency, etc.).
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

export type ProgramMuscleNumberEditScreenProps = {
  title: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unitLabel?: string;
  onChange: (next: number) => void;
  testID: string;
};

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
        size={22}
        color={disabled ? UI_TEXT_MUTED : SYSTEM_ACCENT}
      />
    </Pressable>
  );
}

export function ProgramMuscleNumberEditScreen({
  title,
  description,
  value,
  min,
  max,
  step = 1,
  unitLabel,
  onChange,
  testID,
}: ProgramMuscleNumberEditScreenProps): React.ReactElement {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  const atMin = value <= min;
  const atMax = value >= max;
  const displayValue = unitLabel != null ? `${value} ${unitLabel}` : String(value);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
      showsVerticalScrollIndicator={false}
      accessibilityLabel={title}
    >
      <Text style={styles.description}>{description}</Text>
      <View style={styles.card} testID={testID}>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={styles.stepper}>
          <StepperButton
            kind="decrement"
            label={`Decrease ${title}`}
            disabled={atMin}
            onPress={() => onChange(Math.max(min, value - step))}
          />
          <Text style={styles.value} testID={`${testID}-value`}>
            {displayValue}
          </Text>
          <StepperButton
            kind="increment"
            label={`Increase ${title}`}
            disabled={atMax}
            onPress={() => onChange(Math.min(max, value + step))}
          />
        </View>
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
    padding: 20,
    gap: 16,
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  stepBtn: {
    width: 48,
    height: 48,
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
    minWidth: 80,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
});
