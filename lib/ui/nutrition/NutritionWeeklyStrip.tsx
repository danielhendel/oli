import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CalendarDay } from "@/lib/ui/calendar/types";
import type { NutritionDayStripMeta } from "@/lib/data/nutrition/nutritionWeeklyStripMeta";
import { WEEKLY_STRIP_SELECTED_DAY_CIRCLE_FILL } from "@/lib/ui/calendar/weeklyCalendarStripTheme";
import { NutritionDayRing } from "@/lib/ui/calendar/NutritionDayRing";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDayOfWeekLabel(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  const dow = d.getUTCDay();
  return DAY_LABELS[dow] ?? "";
}

function getDayOfMonth(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  return String(d.getUTCDate());
}

export type NutritionWeeklyStripProps = {
  days: CalendarDay<NutritionDayStripMeta>[];
  selectedDay?: string;
  onDayPress: (day: string) => void;
};

/**
 * Week strip aligned with {@link WeeklyStrip} (Strength): typography, spacing, selection; accent rings when logged.
 */
export function NutritionWeeklyStrip({ days, selectedDay, onDayPress }: NutritionWeeklyStripProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {days.map((d) => {
          const hasNutrition = d.meta?.hasNutrition === true;
          const isSelected = selectedDay === d.day;
          return (
            <Pressable
              key={d.day}
              onPress={() => onDayPress(d.day)}
              accessibilityRole="button"
              accessibilityLabel={hasNutrition ? `${d.day}, nutrition logged` : `${d.day}, no nutrition log`}
              style={({ pressed }) => [
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                pressed && styles.dayCellPressed,
              ]}
              hitSlop={8}
            >
              <Text style={styles.dayOfWeek}>{getDayOfWeekLabel(d.day)}</Text>
              <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                <View style={styles.dayRingBackdrop} pointerEvents="none">
                  <NutritionDayRing
                    size={40}
                    hasNutrition={hasNutrition}
                    emphasized={isSelected}
                    outerTestID={`nutrition-weekly-outer-ring-${d.day}`}
                  />
                </View>
                <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>{getDayOfMonth(d.day)}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 0,
    paddingBottom: 2,
    paddingTop: 0,
  },
  row: {
    flexDirection: "row",
    width: "100%",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  dayCell: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  dayCellSelected: {},
  dayCellPressed: {
    opacity: 0.7,
  },
  dayOfWeek: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 2,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  dayRingBackdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: {
    backgroundColor: WEEKLY_STRIP_SELECTED_DAY_CIRCLE_FILL,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  dayNumberSelected: {
    color: "#FFFFFF",
  },
});
