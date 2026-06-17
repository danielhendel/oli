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
import { HeaderLogListButton } from "@/lib/ui/HeaderLogListButton";
import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

export type HeaderControlsProps = {
  /** Default matches historical `WorkoutsHeaderRightRow` spacing (single capsule child). */
  gap?: number;
  onCalendarPress?: () => void;
  calendarAccessibilityLabel?: string;
  /** Defaults to primary label color (same family as back chevron). */
  calendarIconColor?: string;
  calendarIconSize?: number;
  onLogPress?: () => void;
  logAccessibilityLabel?: string;
  /** Defaults to primary label color (same family as calendar icon). */
  logIconColor?: string;
  logIconSize?: number;
  /** @deprecated Use {@link onLogPress} */
  onOverflowPress?: () => void;
  /** @deprecated Use {@link logAccessibilityLabel} */
  overflowAccessibilityLabel?: string;
};

/**
 * Trailing header cluster: one shared capsule with individually tappable calendar + log-list segments.
 * Handlers and labels are owned by the screen; this component is chrome only.
 */
export function HeaderControls({
  gap = 12,
  onCalendarPress,
  calendarAccessibilityLabel,
  calendarIconColor = UI_TEXT_PRIMARY,
  calendarIconSize = 24,
  onLogPress,
  logAccessibilityLabel,
  logIconColor = UI_TEXT_PRIMARY,
  logIconSize = 22,
  onOverflowPress,
  overflowAccessibilityLabel,
}: HeaderControlsProps) {
  const resolvedLogPress = onLogPress ?? onOverflowPress;
  const resolvedLogLabel = logAccessibilityLabel ?? overflowAccessibilityLabel;
  const showCalendar = onCalendarPress != null && calendarAccessibilityLabel != null;
  const showLog = resolvedLogPress != null && resolvedLogLabel != null;

  if (!showCalendar && !showLog) {
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
        {showCalendar && showLog ? <View style={headerChromeCapsuleDivider} /> : null}
        {showLog ? (
          <HeaderLogListButton
            onPress={resolvedLogPress}
            accessibilityLabel={resolvedLogLabel}
            iconColor={logIconColor}
            iconSize={logIconSize}
          />
        ) : null}
      </View>
    </WorkoutsHeaderRightRow>
  );
}
