import React from "react";
import { View, Pressable, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  headerChromeCapsuleDivider,
  headerChromeCapsuleSegmentBase,
  headerChromeCapsuleSegmentPressed,
  headerChromeCapsuleShell,
} from "@/lib/ui/headerChrome";
import { WorkoutsHeaderRightRow } from "@/lib/ui/headers/WorkoutsHeaderRightRow";
import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

export type LabsHeaderControlsProps = {
  onUploadPress: () => void;
  uploadAccessibilityLabel?: string;
  onListPress: () => void;
  listAccessibilityLabel?: string;
};

/** Trailing Labs header cluster: upload PDF + uploads list. */
export function LabsHeaderControls({
  onUploadPress,
  uploadAccessibilityLabel = "Upload lab PDF",
  onListPress,
  listAccessibilityLabel = "Open lab uploads list",
}: LabsHeaderControlsProps) {
  return (
    <WorkoutsHeaderRightRow gap={12}>
      <View style={headerChromeCapsuleShell as ViewStyle}>
        <Pressable
          onPress={onUploadPress}
          accessibilityRole="button"
          accessibilityLabel={uploadAccessibilityLabel}
          hitSlop={8}
          testID="labs-header-upload"
          style={({ pressed }) => [
            headerChromeCapsuleSegmentBase,
            pressed && headerChromeCapsuleSegmentPressed,
          ]}
        >
          <Ionicons name="cloud-upload-outline" size={22} color={UI_TEXT_PRIMARY} />
        </Pressable>
        <View style={headerChromeCapsuleDivider} />
        <Pressable
          onPress={onListPress}
          accessibilityRole="button"
          accessibilityLabel={listAccessibilityLabel}
          hitSlop={8}
          testID="labs-header-list"
          style={({ pressed }) => [
            headerChromeCapsuleSegmentBase,
            pressed && headerChromeCapsuleSegmentPressed,
          ]}
        >
          <Ionicons name="list-outline" size={22} color={UI_TEXT_PRIMARY} />
        </Pressable>
      </View>
    </WorkoutsHeaderRightRow>
  );
}
