import React from "react";
import { View } from "react-native";

import { CalendarDayCell } from "@/lib/ui/calendar/CalendarDayCell";
import { calendarStripDayOfMonth, calendarStripDayOfWeekLabel } from "@/lib/ui/calendar/calendarWeeklyStripDayUtils";
import { calendarWeeklyStripStyles } from "@/lib/ui/calendar/calendarWeeklyStripStyles";
import type { CalendarDay } from "@/lib/ui/calendar/types";
import type { NutritionDayStripMeta } from "@/lib/data/nutrition/nutritionWeeklyStripMeta";
import { NutritionDayRing } from "@/lib/ui/calendar/NutritionDayRing";

export type NutritionWeeklyStripProps = {
  days: CalendarDay<NutritionDayStripMeta>[];
  selectedDay?: string;
  onDayPress: (day: string) => void;
};

/**
 * Week strip aligned with Strength / Body modules; accent rings when nutrition is logged.
 */
export function NutritionWeeklyStrip({ days, selectedDay, onDayPress }: NutritionWeeklyStripProps) {
  return (
    <View style={calendarWeeklyStripStyles.container}>
      <View style={calendarWeeklyStripStyles.row}>
        {days.map((d) => {
          const hasNutrition = d.meta?.hasNutrition === true;
          const isSelected = selectedDay === d.day;
          return (
            <CalendarDayCell
              key={d.day}
              dayOfWeekLabel={calendarStripDayOfWeekLabel(d.day)}
              dayOfMonthLabel={calendarStripDayOfMonth(d.day)}
              isSelected={isSelected}
              onPress={() => onDayPress(d.day)}
              accessibilityLabel={
                hasNutrition ? `${d.day}, nutrition logged` : `${d.day}, no nutrition log`
              }
              ring={
                <NutritionDayRing
                  size={40}
                  hasNutrition={hasNutrition}
                  emphasized={isSelected}
                  outerTestID={`nutrition-weekly-outer-ring-${d.day}`}
                />
              }
            />
          );
        })}
      </View>
    </View>
  );
}
