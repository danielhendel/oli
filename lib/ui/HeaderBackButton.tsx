import React from "react";
import { Pressable, StyleSheet, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { headerChromeCircleShell } from "@/lib/ui/headerChrome";
import { UI_HEADER_CHROME_BG, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

/** Neutral header chrome (card-surface family), not primary CTA black. */
export const HEADER_BACK_BUTTON_BG = UI_HEADER_CHROME_BG;
export const HEADER_BACK_BUTTON_ICON = UI_TEXT_PRIMARY;

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
    alignItems: "center",
    justifyContent: "center",
    ...headerChromeCircleShell,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
