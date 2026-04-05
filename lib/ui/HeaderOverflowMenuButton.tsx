import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import {
  headerChromeCapsuleSegmentBase,
  headerChromeCapsuleSegmentPressed,
} from "@/lib/ui/headerChrome";
import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

export type HeaderOverflowMenuButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
};

/**
 * Overflow segment for use inside {@link HeaderControls} capsule (or same metrics if reused).
 */
export function HeaderOverflowMenuButton({ onPress, accessibilityLabel }: HeaderOverflowMenuButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        headerChromeCapsuleSegmentBase,
        pressed && headerChromeCapsuleSegmentPressed,
      ]}
    >
      <Text style={styles.dots}>•••</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dots: {
    fontSize: 18,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
});
