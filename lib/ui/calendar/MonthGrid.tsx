import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { DayKey } from "./types";
import { getMonthGrid, formatMonthYearLabel, getTodayDayKeyLocal, type MonthYear } from "./dateUtils";
import type { WorkoutMarkerFlags } from "@/lib/data/workouts/workoutMarkerFlags";
import { UI_TEXT_PRIMARY, UI_TEXT_MUTED } from "@/lib/ui/theme/uiTokens";
import { WorkoutDayRing } from "./WorkoutDayRing";

export type MonthGridProps = {
  monthYear: MonthYear;
  markerForDay: (day: DayKey) => WorkoutMarkerFlags | null;
  onDayPress: (day: DayKey) => void;
};

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function MonthGrid({ monthYear, markerForDay, onDayPress }: MonthGridProps) {
  const todayKey = getTodayDayKeyLocal();
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
                <View style={styles.dayCircle}>
                  <View style={styles.dayRingBackdrop} pointerEvents="none">
                    <WorkoutDayRing
                      size={32}
                      hasStrength={hasStrength}
                      hasCardio={hasCardio}
                      emphasized={dayKey === todayKey}
                      outerTestID={`month-outer-ring-${dayKey}`}
                      innerTestID={`month-cardio-inner-ring-${dayKey}`}
                    />
                  </View>
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
    paddingTop: 10,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
    textAlign: "center",
    letterSpacing: -0.28,
    marginBottom: 14,
  },
  dowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dowLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
    letterSpacing: 0.15,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
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
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  dayRingBackdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.2,
  },
});

