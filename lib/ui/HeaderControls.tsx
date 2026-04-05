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
import { HeaderOverflowMenuButton } from "@/lib/ui/HeaderOverflowMenuButton";
import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

export type HeaderControlsProps = {
  /** Default matches historical `WorkoutsHeaderRightRow` spacing (single capsule child). */
  gap?: number;
  onCalendarPress?: () => void;
  calendarAccessibilityLabel?: string;
  /** Defaults to primary label color (same family as back chevron). */
  calendarIconColor?: string;
  calendarIconSize?: number;
  onOverflowPress?: () => void;
  overflowAccessibilityLabel?: string;
};

/**
 * Trailing header cluster: one shared capsule with individually tappable calendar + overflow segments.
 * Handlers and labels are owned by the screen; this component is chrome only.
 */
export function HeaderControls({
  gap = 12,
  onCalendarPress,
  calendarAccessibilityLabel,
  calendarIconColor = UI_TEXT_PRIMARY,
  calendarIconSize = 24,
  onOverflowPress,
  overflowAccessibilityLabel,
}: HeaderControlsProps) {
  const showCalendar = onCalendarPress != null && calendarAccessibilityLabel != null;
  const showOverflow = onOverflowPress != null && overflowAccessibilityLabel != null;

  if (!showCalendar && !showOverflow) {
    return null;
  }

  return (
    <WorkoutsHeaderRightRow gap={gap}>
      <View style={headerChromeCapsuleShell as ViewStyle}>
        {showCalendar ? (
          <Pressable
            onPress={onCalendarPress}
            accessibilityRole="button"
            accessibilityLabel={calendarAccessibilityLabel}
            hitSlop={8}
            style={({ pressed }) => [
              headerChromeCapsuleSegmentBase,
              pressed && headerChromeCapsuleSegmentPressed,
            ]}
          >
            <Ionicons name="calendar-outline" size={calendarIconSize} color={calendarIconColor} />
          </Pressable>
        ) : null}
        {showCalendar && showOverflow ? <View style={headerChromeCapsuleDivider} /> : null}
        {showOverflow ? (
          <HeaderOverflowMenuButton onPress={onOverflowPress} accessibilityLabel={overflowAccessibilityLabel} />
        ) : null}
      </View>
    </WorkoutsHeaderRightRow>
  );
}
