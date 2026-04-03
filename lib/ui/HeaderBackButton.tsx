import React from "react";
import { Pressable, StyleSheet, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/** Neutral header chrome (card-surface family), not primary CTA black. */
export const HEADER_BACK_BUTTON_BG = "#F2F2F7";
export const HEADER_BACK_BUTTON_ICON = "#1C1C1E";

const VISUAL_SIZE = 40;
const ICON_SIZE = 20;

export type HeaderBackButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
  /** Applied after base styles; use `{ marginLeft: 0 }` inside custom in-screen chrome. */
  style?: ViewStyle;
  testID?: string;
};

/**
 * Soft circular back control for stack headers and workout flows.
 * Touch target: 40pt circle + default hitSlop (native minimum ~44pt effective).
 */
export function HeaderBackButton({
  onPress,
  accessibilityLabel = "Go back",
  style,
  testID,
}: HeaderBackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      testID={testID}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, style]}
    >
      <Ionicons name="chevron-back" size={ICON_SIZE} color={HEADER_BACK_BUTTON_ICON} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: VISUAL_SIZE,
    height: VISUAL_SIZE,
    borderRadius: VISUAL_SIZE / 2,
    marginLeft: 12,
    backgroundColor: HEADER_BACK_BUTTON_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
