import React from "react";
import { View } from "react-native";

import type { ActivityDayStripMeta } from "@/lib/data/activity/activityDayStripMeta";
import { buildActivityCalendarDayModelFromStripMeta } from "@/lib/ui/activity/activityCalendarDayRingPresentation";
import { CalendarDayCell } from "@/lib/ui/calendar/CalendarDayCell";
import { calendarStripDayOfMonth, calendarStripDayOfWeekLabel } from "@/lib/ui/calendar/calendarWeeklyStripDayUtils";
import { calendarWeeklyStripStyles } from "@/lib/ui/calendar/calendarWeeklyStripStyles";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import type { CalendarDay } from "@/lib/ui/calendar/types";
import { ActivityDayRing } from "@/lib/ui/activity/ActivityDayRing";

export type ActivityWeeklyStripProps = {
  days: CalendarDay<ActivityDayStripMeta>[];
  selectedDay?: string;
  onDayPress: (day: string) => void;
};

export function ActivityWeeklyStrip({ days, selectedDay, onDayPress }: ActivityWeeklyStripProps) {
  const todayKey = getTodayDayKeyLocal();
  return (
    <View style={calendarWeeklyStripStyles.container}>
      <View style={calendarWeeklyStripStyles.row}>
        {days.map((d) => {
          const meta = d.meta;
          const isSelected = selectedDay === d.day;
          const isToday = d.day === todayKey;
          const ringModel = buildActivityCalendarDayModelFromStripMeta({
            dayKey: d.day,
            todayKey: todayKey,
            meta,
          });
          return (
            <CalendarDayCell
              key={d.day}
              dayOfWeekLabel={calendarStripDayOfWeekLabel(d.day)}
              dayOfMonthLabel={calendarStripDayOfMonth(d.day)}
              isSelected={isSelected}
              isToday={isToday}
              onPress={() => onDayPress(d.day)}
              accessibilityLabel={`${d.day}, ${ringModel.accessibilityDetail}`}
              emphasizeSelectedTypography
              ring={
                <ActivityDayRing
                  size={40}
                  presentation={ringModel.presentation}
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
