import React from "react";
import { Pressable, StyleSheet, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { headerChromeCircleShell } from "@/lib/ui/headerChrome";
import { UI_HEADER_CHROME_BG, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

/** Neutral header chrome (card-surface family), not primary CTA black. */
export const HEADER_BACK_BUTTON_BG = UI_HEADER_CHROME_BG;
export const HEADER_BACK_BUTTON_ICON = UI_TEXT_PRIMARY;

const VISUAL_DEFAULT = 40;
const ICON_DEFAULT = 20;
const VISUAL_LARGE = 48;
const ICON_LARGE = 22;

export type HeaderBackButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
  /** Larger circle for workout logger and other dense chrome. */
  size?: "default" | "large";
  /** Applied after base styles; use `{ marginLeft: 0 }` inside custom in-screen chrome. */
  style?: ViewStyle;
  testID?: string;
};

/**
 * Soft circular back control for stack headers and workout flows.
 * Default: 40pt circle (`large`: 48pt) + default hitSlop (native minimum ~44pt effective).
 */
export function HeaderBackButton({
  onPress,
  accessibilityLabel = "Go back",
  size = "default",
  style,
  testID,
}: HeaderBackButtonProps) {
  const visual = size === "large" ? VISUAL_LARGE : VISUAL_DEFAULT;
  const icon = size === "large" ? ICON_LARGE : ICON_DEFAULT;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        { width: visual, height: visual, borderRadius: visual / 2 },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons name="chevron-back" size={icon} color={HEADER_BACK_BUTTON_ICON} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    marginLeft: 12,
    alignItems: "center",
    justifyContent: "center",
    ...headerChromeCircleShell,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
