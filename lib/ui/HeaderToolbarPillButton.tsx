import React from "react";
import { Pressable, StyleSheet, type ViewStyle } from "react-native";

import { headerChromeCircleShell } from "@/lib/ui/headerChrome";

export const HEADER_TOOLBAR_PILL_SIZE = 40;

export type HeaderToolbarPillButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
  testID?: string;
  style?: ViewStyle;
};

/**
 * Standalone circular header action — same border + shadow family as {@link HeaderBackButton}.
 * Prefer {@link HeaderControls} for trailing calendar/overflow on module screens.
 */
export function HeaderToolbarPillButton({
  onPress,
  accessibilityLabel,
  children,
  testID,
  style,
}: HeaderToolbarPillButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      testID={testID}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: HEADER_TOOLBAR_PILL_SIZE,
    height: HEADER_TOOLBAR_PILL_SIZE,
    borderRadius: HEADER_TOOLBAR_PILL_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    ...headerChromeCircleShell,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
