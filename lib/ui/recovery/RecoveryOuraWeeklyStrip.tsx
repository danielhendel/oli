import React from "react";
import { View } from "react-native";

import { CalendarDayCell } from "@/lib/ui/calendar/CalendarDayCell";
import { calendarStripDayOfMonth, calendarStripDayOfWeekLabel } from "@/lib/ui/calendar/calendarWeeklyStripDayUtils";
import { calendarWeeklyStripStyles } from "@/lib/ui/calendar/calendarWeeklyStripStyles";
import type { CalendarDay } from "@/lib/ui/calendar/types";
import { BodyDayRing } from "@/lib/ui/body/BodyDayRing";

export type RecoveryOuraDayMarker = {
  hasOuraSnapshot: boolean;
};

export type RecoveryOuraWeeklyStripProps = {
  days: CalendarDay<RecoveryOuraDayMarker>[];
  selectedDay?: string;
  onDayPress: (day: string) => void;
  /** Used for accessibility strings only. */
  categoryLabel: "sleep" | "readiness";
  testIDPrefix?: string;
};

export function RecoveryOuraWeeklyStrip({
  days,
  selectedDay,
  onDayPress,
  categoryLabel,
  testIDPrefix = "recovery-oura-weekly",
}: RecoveryOuraWeeklyStripProps) {
  return (
    <View style={calendarWeeklyStripStyles.container}>
      <View style={calendarWeeklyStripStyles.row}>
        {days.map((d) => {
          const hasOuraSnapshot = d.meta?.hasOuraSnapshot === true;
          const isSelected = selectedDay === d.day;
          const noun = categoryLabel === "sleep" ? "sleep data" : "readiness data";
          return (
            <CalendarDayCell
              key={d.day}
              dayOfWeekLabel={calendarStripDayOfWeekLabel(d.day)}
              dayOfMonthLabel={calendarStripDayOfMonth(d.day)}
              isSelected={isSelected}
              onPress={() => onDayPress(d.day)}
              accessibilityLabel={
                hasOuraSnapshot
                  ? `${d.day}, has Oura ${noun}`
                  : `${d.day}, no Oura ${noun}`
              }
              ring={
                <BodyDayRing
                  size={40}
                  hasMeasurement={hasOuraSnapshot}
                  emphasized={isSelected}
                  testID={`${testIDPrefix}-ring-${d.day}`}
                />
              }
            />
          );
        })}
      </View>
    </View>
  );
}
