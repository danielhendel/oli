import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DayKey } from "@/lib/ui/calendar/types";
import {
  formatMonthYearLabel,
  getMonthGrid,
  getTodayDayKeyLocal,
  type MonthYear,
} from "@/lib/ui/calendar/dateUtils";
import { BodyDayRing } from "./BodyDayRing";

type BodyMonthGridProps = {
  monthYear: MonthYear;
  markerForDay: (day: DayKey) => boolean;
  onDayPress: (day: DayKey) => void;
};

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function BodyMonthGrid({ monthYear, markerForDay, onDayPress }: BodyMonthGridProps) {
  const todayKey = getTodayDayKeyLocal();
  const weeks = getMonthGrid(monthYear);
  const paddedWeeks = [...weeks];
  while (paddedWeeks.length < 6) paddedWeeks.push([null, null, null, null, null, null, null]);

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
            if (!dayKey) return <View key={`${idx}-${colIdx}`} style={styles.dayCellEmpty} />;
            const hasMeasurement = markerForDay(dayKey);
            return (
              <Pressable
                key={dayKey}
                onPress={() => onDayPress(dayKey)}
                accessibilityRole="button"
                accessibilityLabel={
                  hasMeasurement
                    ? `${dayKey}, has body measurement`
                    : `${dayKey}, no body measurement`
                }
                hitSlop={8}
                style={({ pressed }) => [styles.dayCell, pressed && styles.dayCellPressed]}
              >
                <View style={styles.dayCircle}>
                  <View style={styles.dayRingBackdrop} pointerEvents="none">
                    <BodyDayRing
                      size={32}
                      hasMeasurement={hasMeasurement}
                      emphasized={dayKey === todayKey}
                      testID={`body-month-ring-${dayKey}`}
                    />
                  </View>
                  <Text style={styles.dayNumber}>{Number(dayKey.slice(8, 10))}</Text>
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
  container: { paddingHorizontal: 16, paddingTop: 4 },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
    textAlign: "center",
    marginBottom: 12,
  },
  dowRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  dowLabel: { flex: 1, textAlign: "center", fontSize: 12, color: "#8E8E93" },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  dayCellEmpty: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44 },
  dayCell: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44 },
  dayCellPressed: { opacity: 0.7 },
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
  dayNumber: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
});

