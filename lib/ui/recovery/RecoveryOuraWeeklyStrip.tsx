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
  categoryLabel: "sleep" | "readiness" | "stress";
  testIDPrefix?: string;
  /** Stronger selected-day typography + softer unselected labels (Sleep polish). */
  stripVariant?: "default" | "sleep";
};

export function RecoveryOuraWeeklyStrip({
  days,
  selectedDay,
  onDayPress,
  categoryLabel,
  testIDPrefix = "recovery-oura-weekly",
  stripVariant = "default",
}: RecoveryOuraWeeklyStripProps) {
  return (
    <View style={calendarWeeklyStripStyles.container}>
      <View style={calendarWeeklyStripStyles.row}>
        {days.map((d) => {
          const hasOuraSnapshot = d.meta?.hasOuraSnapshot === true;
          const isSelected = selectedDay === d.day;
          const accessibilityLabel =
            categoryLabel === "sleep"
              ? hasOuraSnapshot
                ? `${d.day}, has sleep data`
                : `${d.day}, no sleep data`
              : categoryLabel === "stress"
                ? hasOuraSnapshot
                  ? `${d.day}, has Oura stress data`
                  : `${d.day}, no Oura stress data`
                : hasOuraSnapshot
                  ? `${d.day}, has Oura readiness data`
                  : `${d.day}, no Oura readiness data`;
          return (
            <CalendarDayCell
              key={d.day}
              dayOfWeekLabel={calendarStripDayOfWeekLabel(d.day)}
              dayOfMonthLabel={calendarStripDayOfMonth(d.day)}
              isSelected={isSelected}
              emphasizeSelectedTypography={stripVariant === "sleep"}
              stripVariant={stripVariant === "sleep" ? "sleep" : "default"}
              onPress={() => onDayPress(d.day)}
              accessibilityLabel={accessibilityLabel}
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
