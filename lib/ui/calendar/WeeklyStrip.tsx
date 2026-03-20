import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CalendarDay, WorkoutDayMarker } from "./types";
import { WorkoutDayRing } from "./WorkoutDayRing";

export type WeeklyStripProps = {
  days: CalendarDay<WorkoutDayMarker>[];
  selectedDay?: string;
  onDayPress: (day: string) => void;
};

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

export function WeeklyStrip({ days, selectedDay, onDayPress }: WeeklyStripProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {days.map((d) => {
          const marker = d.meta;
          const isSelected = selectedDay === d.day;
          const hasWorkouts = marker?.hasWorkouts === true;
          const hasStrength = marker?.hasStrength === true;
          const hasCardio = marker?.hasCardio === true;
          return (
            <Pressable
              key={d.day}
              onPress={() => onDayPress(d.day)}
              accessibilityRole="button"
              accessibilityLabel={
                hasWorkouts
                  ? `${d.day}, has workouts`
                  : `${d.day}, no workouts`
              }
              style={({ pressed }) => [
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                pressed && styles.dayCellPressed,
              ]}
              hitSlop={8}
            >
              <Text style={styles.dayOfWeek}>{getDayOfWeekLabel(d.day)}</Text>
              <View
                style={[
                  styles.dayCircle,
                  isSelected && styles.dayCircleSelected,
                ]}
              >
                <WorkoutDayRing
                  size={40}
                  hasStrength={hasStrength}
                  hasCardio={hasCardio}
                  outerTestID={`weekly-outer-ring-${d.day}`}
                  innerTestID={`weekly-cardio-inner-ring-${d.day}`}
                />
                <Text
                  style={[
                    styles.dayNumber,
                    isSelected && styles.dayNumberSelected,
                  ]}
                >
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
  /** No horizontal padding: parent (e.g. ModuleScreenShell header) already applies page gutter (16). */
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
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: {
    backgroundColor: "#1C1C1E",
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

