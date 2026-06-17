import React from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  headerChromeCapsuleSegmentBase,
  headerChromeCapsuleSegmentPressed,
} from "@/lib/ui/headerChrome";
import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

export type HeaderLogListButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
  iconColor?: string;
  iconSize?: number;
};

/**
 * Log/history list segment for use inside {@link HeaderControls} capsule.
 */
export function HeaderLogListButton({
  onPress,
  accessibilityLabel,
  iconColor = UI_TEXT_PRIMARY,
  iconSize = 22,
}: HeaderLogListButtonProps) {
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
      testID="header-log-list-button"
    >
      <Ionicons name="list-outline" size={iconSize} color={iconColor} />
    </Pressable>
  );
}
