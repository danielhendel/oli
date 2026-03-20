import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { DayKey } from "./types";
import { getMonthGrid, formatMonthYearLabel, type MonthYear } from "./dateUtils";
import type { WorkoutMarkerFlags } from "@/lib/data/workouts/workoutMarkerFlags";
import { WorkoutDayRing } from "./WorkoutDayRing";

export type MonthGridProps = {
  monthYear: MonthYear;
  markerForDay: (day: DayKey) => WorkoutMarkerFlags | null;
  onDayPress: (day: DayKey) => void;
};

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function MonthGrid({ monthYear, markerForDay, onDayPress }: MonthGridProps) {
  const weeks = getMonthGrid(monthYear);
  const paddedWeeks = [...weeks];
  while (paddedWeeks.length < 6) {
    paddedWeeks.push([null, null, null, null, null, null, null]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>{formatMonthYearLabel(monthYear)}</Text>
      <View style={styles.dowRow}>
        {DOW_LABELS.map((label) => (
          <Text key={label} style={styles.dowLabel}>
            {label}
          </Text>
        ))}
      </View>
      {paddedWeeks.map((week, idx) => (
        <View key={idx} style={styles.weekRow}>
          {week.map((dayKey, colIdx) => {
            if (!dayKey) {
              return <View key={colIdx} style={styles.dayCellEmpty} />;
            }
            const marker = markerForDay(dayKey);
            const hasStrength = !!marker?.hasStrength;
            const hasCardio = !!marker?.hasCardio;
            const hasWorkoutMarker = hasStrength || hasCardio;
            return (
              <Pressable
                key={dayKey}
                onPress={() => onDayPress(dayKey)}
                accessibilityRole="button"
                accessibilityLabel={
                  hasWorkoutMarker ? `${dayKey}, has workouts` : `${dayKey}, no workouts`
                }
                style={({ pressed }) => [
                  styles.dayCell,
                  pressed && styles.dayCellPressed,
                ]}
                hitSlop={8}
              >
                <View
                  style={[
                    styles.dayCircle,
                  ]}
                >
                  <WorkoutDayRing
                    size={32}
                    hasStrength={hasStrength}
                    hasCardio={hasCardio}
                    outerTestID={`month-outer-ring-${dayKey}`}
                    innerTestID={`month-cardio-inner-ring-${dayKey}`}
                  />
                  <Text style={styles.dayNumber}>
                    {Number(dayKey.slice(8, 10))}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
    textAlign: "center",
    marginBottom: 12,
  },
  dowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dowLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: "#8E8E93",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  dayCellEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  dayCellPressed: {
    opacity: 0.7,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
  },
});

