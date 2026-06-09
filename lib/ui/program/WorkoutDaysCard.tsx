// lib/ui/program/WorkoutDaysCard.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { WorkoutDaySummary } from "@/lib/data/program/workoutBuilderTypes";
import { ProgramSectionCard } from "@/lib/ui/program/ProgramSectionCard";
import {
  UI_BORDER_HAIRLINE,
  UI_SURFACE_PRESSED,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

function DayRow({ day }: { day: WorkoutDaySummary }): React.ReactElement {
  return (
    <View style={styles.day} accessibilityLabel={`${day.weekday}, ${day.sessionName}`}>
      <View style={styles.dayHeader}>
        <View style={styles.dayTitleWrap}>
          <Text style={styles.session}>{day.sessionName}</Text>
          <Text style={styles.weekday}>
            {day.weekday} · {day.focusLabel}
          </Text>
        </View>
        <Pressable
          disabled
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel={`Edit ${day.sessionName}. Coming soon`}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>Edit day</Text>
        </Pressable>
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{day.exerciseCount}</Text>
          <Text style={styles.metricLabel}>exercises</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{day.estimatedSets}</Text>
          <Text style={styles.metricLabel}>est. sets</Text>
        </View>
      </View>
    </View>
  );
}

export function WorkoutDaysCard({
  days,
}: {
  days: WorkoutDaySummary[];
}): React.ReactElement {
  return (
    <ProgramSectionCard
      title="Workout Days"
      subtitle="Strength sessions in this program."
      testID="workout-days-card"
    >
      <View style={styles.list}>
        {days.map((day) => (
          <DayRow key={day.id} day={day} />
        ))}
      </View>
    </ProgramSectionCard>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  day: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  dayTitleWrap: {
    flex: 1,
    gap: 2,
  },
  session: {
    fontSize: 16,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  weekday: {
    fontSize: 13,
    color: UI_TEXT_SECONDARY,
  },
  editButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI_SURFACE_PRESSED,
    opacity: 0.55,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
  metrics: {
    flexDirection: "row",
    gap: 24,
  },
  metric: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    fontVariant: ["tabular-nums"],
  },
  metricLabel: {
    fontSize: 12,
    color: UI_TEXT_MUTED,
  },
});
