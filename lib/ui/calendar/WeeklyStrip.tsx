import React from "react";
import { View } from "react-native";

import { CalendarDayCell } from "@/lib/ui/calendar/CalendarDayCell";
import { calendarStripDayOfMonth, calendarStripDayOfWeekLabel } from "@/lib/ui/calendar/calendarWeeklyStripDayUtils";
import { calendarWeeklyStripStyles } from "@/lib/ui/calendar/calendarWeeklyStripStyles";
import type { CalendarDay, WorkoutDayMarker } from "./types";
import { WorkoutDayRing } from "./WorkoutDayRing";

export type WeeklyStripProps = {
  days: CalendarDay<WorkoutDayMarker>[];
  selectedDay?: string;
  onDayPress: (day: string) => void;
};

export function WeeklyStrip({ days, selectedDay, onDayPress }: WeeklyStripProps) {
  return (
    <View style={calendarWeeklyStripStyles.container}>
      <View style={calendarWeeklyStripStyles.row}>
        {days.map((d) => {
          const marker = d.meta;
          const isSelected = selectedDay === d.day;
          const hasWorkouts = marker?.hasWorkouts === true;
          const hasStrength = marker?.hasStrength === true;
          const hasCardio = marker?.hasCardio === true;
          return (
            <CalendarDayCell
              key={d.day}
              dayOfWeekLabel={calendarStripDayOfWeekLabel(d.day)}
              dayOfMonthLabel={calendarStripDayOfMonth(d.day)}
              isSelected={isSelected}
              onPress={() => onDayPress(d.day)}
              accessibilityLabel={
                hasWorkouts ? `${d.day}, has workouts` : `${d.day}, no workouts`
              }
              ring={
                <WorkoutDayRing
                  size={40}
                  hasStrength={hasStrength}
                  hasCardio={hasCardio}
                  emphasized={isSelected}
                  outerTestID={`weekly-outer-ring-${d.day}`}
                  innerTestID={`weekly-cardio-inner-ring-${d.day}`}
                />
              }
            />
          );
        })}
      </View>
    </View>
  );
}
