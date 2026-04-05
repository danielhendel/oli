import React from "react";
import { Pressable, Text, View } from "react-native";

import { calendarWeeklyStripStyles } from "@/lib/ui/calendar/calendarWeeklyStripStyles";

export type CalendarDayCellProps = {
  dayOfWeekLabel: string;
  dayOfMonthLabel: string;
  isSelected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  /** Ring layer (workout / body / nutrition); `null` when the day has no ring. */
  ring: React.ReactNode;
};

/**
 * Single day column for module weekly strips — shared chrome, domain-specific `ring`.
 */
export function CalendarDayCell({
  dayOfWeekLabel,
  dayOfMonthLabel,
  isSelected,
  onPress,
  accessibilityLabel,
  ring,
}: CalendarDayCellProps) {
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
      <Text style={calendarWeeklyStripStyles.dayOfWeek}>{dayOfWeekLabel}</Text>
      <View
        style={[
          calendarWeeklyStripStyles.dayCircle,
          isSelected && calendarWeeklyStripStyles.dayCircleSelected,
        ]}
      >
        <View style={calendarWeeklyStripStyles.dayRingBackdrop} pointerEvents="none">
          {ring}
        </View>
        <Text style={calendarWeeklyStripStyles.dayNumber}>{dayOfMonthLabel}</Text>
      </View>
    </Pressable>
  );
}
