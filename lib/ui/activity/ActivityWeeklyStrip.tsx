import React from "react";
import { View } from "react-native";

import type { ActivityDayStripMeta } from "@/lib/data/activity/activityDayStripMeta";
import { CalendarDayCell } from "@/lib/ui/calendar/CalendarDayCell";
import { calendarStripDayOfMonth, calendarStripDayOfWeekLabel } from "@/lib/ui/calendar/calendarWeeklyStripDayUtils";
import { calendarWeeklyStripStyles } from "@/lib/ui/calendar/calendarWeeklyStripStyles";
import type { CalendarDay } from "@/lib/ui/calendar/types";
import { ActivityDayRing } from "@/lib/ui/activity/ActivityDayRing";

export type ActivityWeeklyStripProps = {
  days: CalendarDay<ActivityDayStripMeta>[];
  selectedDay?: string;
  onDayPress: (day: string) => void;
};

export function ActivityWeeklyStrip({ days, selectedDay, onDayPress }: ActivityWeeklyStripProps) {
  return (
    <View style={calendarWeeklyStripStyles.container}>
      <View style={calendarWeeklyStripStyles.row}>
        {days.map((d) => {
          const hasSteps = d.meta?.hasSteps === true;
          const isSelected = selectedDay === d.day;
          return (
            <CalendarDayCell
              key={d.day}
              dayOfWeekLabel={calendarStripDayOfWeekLabel(d.day)}
              dayOfMonthLabel={calendarStripDayOfMonth(d.day)}
              isSelected={isSelected}
              onPress={() => onDayPress(d.day)}
              accessibilityLabel={
                hasSteps ? `${d.day}, steps in daily rollup` : `${d.day}, no steps in daily rollup`
              }
              ring={
                <ActivityDayRing
                  size={40}
                  hasSteps={hasSteps}
                  emphasized={isSelected}
                  outerTestID={`activity-weekly-outer-ring-${d.day}`}
                />
              }
            />
          );
        })}
      </View>
    </View>
  );
}
