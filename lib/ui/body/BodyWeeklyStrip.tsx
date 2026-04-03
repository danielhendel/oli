import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CalendarDay } from "@/lib/ui/calendar/types";
import { WEEKLY_STRIP_SELECTED_DAY_CIRCLE_FILL } from "@/lib/ui/calendar/weeklyCalendarStripTheme";
import { BodyDayRing } from "./BodyDayRing";

export type BodyDayMarker = {
  hasMeasurement: boolean;
};

type BodyWeeklyStripProps = {
  days: CalendarDay<BodyDayMarker>[];
  selectedDay?: string;
  onDayPress: (day: string) => void;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDayOfWeekLabel(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  return DAY_LABELS[d.getUTCDay()] ?? "";
}

function getDayOfMonth(dayKey: string): string {
  return String(new Date(`${dayKey}T12:00:00.000Z`).getUTCDate());
}

export function BodyWeeklyStrip({ days, selectedDay, onDayPress }: BodyWeeklyStripProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {days.map((d) => {
          const hasMeasurement = d.meta?.hasMeasurement === true;
          const isSelected = selectedDay === d.day;
          return (
            <Pressable
              key={d.day}
              onPress={() => onDayPress(d.day)}
              accessibilityRole="button"
              accessibilityLabel={
                hasMeasurement ? `${d.day}, has body measurement` : `${d.day}, no body measurement`
              }
              hitSlop={8}
              style={({ pressed }) => [
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                pressed && styles.dayCellPressed,
              ]}
            >
              <Text style={styles.dayOfWeek}>{getDayOfWeekLabel(d.day)}</Text>
              <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                <View style={styles.dayRingBackdrop} pointerEvents="none">
                  <BodyDayRing
                    size={40}
                    hasMeasurement={hasMeasurement}
                    emphasized={isSelected}
                    testID={`body-weekly-ring-${d.day}`}
                  />
                </View>
                <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                  {getDayOfMonth(d.day)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", paddingHorizontal: 0, paddingBottom: 2, paddingTop: 0 },
  row: { flexDirection: "row", width: "100%", alignItems: "flex-start", justifyContent: "space-between" },
  dayCell: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "flex-start" },
  dayCellSelected: {},
  dayCellPressed: { opacity: 0.7 },
  dayOfWeek: { fontSize: 13, color: "#8E8E93", marginBottom: 2 },
  dayCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  dayCircleSelected: { backgroundColor: WEEKLY_STRIP_SELECTED_DAY_CIRCLE_FILL },
  dayRingBackdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: { fontSize: 18, fontWeight: "600", color: "#1C1C1E" },
  dayNumberSelected: { color: "#FFFFFF" },
});

