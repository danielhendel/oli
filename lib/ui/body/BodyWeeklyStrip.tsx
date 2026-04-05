import React from "react";
import { View } from "react-native";

import { CalendarDayCell } from "@/lib/ui/calendar/CalendarDayCell";
import { calendarStripDayOfMonth, calendarStripDayOfWeekLabel } from "@/lib/ui/calendar/calendarWeeklyStripDayUtils";
import { calendarWeeklyStripStyles } from "@/lib/ui/calendar/calendarWeeklyStripStyles";
import type { CalendarDay } from "@/lib/ui/calendar/types";
import { BodyDayRing } from "./BodyDayRing";

export type BodyDayMarker = {
  hasMeasurement: boolean;
};

type BodyWeeklyStripProps = {
  days: CalendarDay<BodyDayMarker>[];
  selectedDay?: string;
  onDayPress: (day: string) => void;
};

export function BodyWeeklyStrip({ days, selectedDay, onDayPress }: BodyWeeklyStripProps) {
  return (
    <View style={calendarWeeklyStripStyles.container}>
      <View style={calendarWeeklyStripStyles.row}>
        {days.map((d) => {
          const hasMeasurement = d.meta?.hasMeasurement === true;
          const isSelected = selectedDay === d.day;
          return (
            <CalendarDayCell
              key={d.day}
              dayOfWeekLabel={calendarStripDayOfWeekLabel(d.day)}
              dayOfMonthLabel={calendarStripDayOfMonth(d.day)}
              isSelected={isSelected}
              onPress={() => onDayPress(d.day)}
              accessibilityLabel={
                hasMeasurement ? `${d.day}, has body measurement` : `${d.day}, no body measurement`
              }
              ring={
                <BodyDayRing
                  size={40}
                  hasMeasurement={hasMeasurement}
                  emphasized={isSelected}
                  testID={`body-weekly-ring-${d.day}`}
                />
              }
            />
          );
        })}
      </View>
    </View>
  );
}
