import React from "react";
import { Pressable, Text, View } from "react-native";

import { calendarWeeklyStripStyles } from "@/lib/ui/calendar/calendarWeeklyStripStyles";
import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

export type CalendarDayCellProps = {
  dayOfWeekLabel: string;
  dayOfMonthLabel: string;
  isSelected: boolean;
  /** Device-local “today” — same light gray circle as Strength strip ({@link calendarWeeklyStripStyles.dayCircleSelected}). */
  isToday?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  /** Ring layer (workout / body / nutrition); `null` when the day has no ring. */
  ring: React.ReactNode;
  /** Slightly stronger weekday + date weight when selected (Activity strip). */
  emphasizeSelectedTypography?: boolean;
  /** Sleep: softer unselected weekday/date ink for clearer selection contrast. */
  stripVariant?: "default" | "sleep";
};

/**
 * Single day column for module weekly strips — shared chrome, domain-specific `ring`.
 */
export function CalendarDayCell({
  dayOfWeekLabel,
  dayOfMonthLabel,
  isSelected,
  isToday = false,
  onPress,
  accessibilityLabel,
  ring,
  emphasizeSelectedTypography = false,
  stripVariant = "default",
}: CalendarDayCellProps) {
  const selectedType = emphasizeSelectedTypography && isSelected;
  const todayOrSelectedCircle = isSelected || isToday;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        calendarWeeklyStripStyles.dayCell,
        isSelected && calendarWeeklyStripStyles.dayCellSelected,
        pressed && calendarWeeklyStripStyles.dayCellPressed,
      ]}
    >
      <Text
        style={[
          calendarWeeklyStripStyles.dayOfWeek,
          stripVariant === "sleep" &&
            !isSelected &&
            calendarWeeklyStripStyles.dayOfWeekSleepMuted,
          selectedType && calendarWeeklyStripStyles.dayOfWeekWhenSelected,
          selectedType && stripVariant === "sleep" && { color: UI_TEXT_PRIMARY },
        ]}
      >
        {dayOfWeekLabel}
      </Text>
      <View
        style={[
          calendarWeeklyStripStyles.dayCircle,
          todayOrSelectedCircle && calendarWeeklyStripStyles.dayCircleSelected,
        ]}
      >
        <View style={calendarWeeklyStripStyles.dayRingBackdrop} pointerEvents="none">
          {ring}
        </View>
        <Text
          style={[
            calendarWeeklyStripStyles.dayNumber,
            stripVariant === "sleep" &&
              !isSelected &&
              calendarWeeklyStripStyles.dayNumberSleepMuted,
            selectedType && calendarWeeklyStripStyles.dayNumberWhenSelected,
          ]}
        >
          {dayOfMonthLabel}
        </Text>
      </View>
    </Pressable>
  );
}
