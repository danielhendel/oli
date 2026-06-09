// lib/ui/program/WorkoutScheduleCard.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  WORKOUT_TRAINING_DAY_TYPE_LABEL,
  type WorkoutScheduleDay,
  type WorkoutTrainingDayType,
} from "@/lib/data/program/workoutBuilderTypes";
import { ProgramSectionCard } from "@/lib/ui/program/ProgramSectionCard";
import {
  UI_BORDER_HAIRLINE,
  UI_SURFACE_PRESSED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_14 } from "@/lib/ui/theme/systemAccent";

/** Strength/full-body day types get the accent chip; cardio/recovery/rest stay neutral. */
const ACCENT_TYPES: ReadonlySet<WorkoutTrainingDayType> = new Set<WorkoutTrainingDayType>([
  "upper",
  "lower",
  "full_body",
]);

function TypeChip({ type }: { type: WorkoutTrainingDayType }): React.ReactElement {
  const accent = ACCENT_TYPES.has(type);
  return (
    <View style={[styles.chip, accent ? styles.chipAccent : styles.chipNeutral]}>
      <Text style={[styles.chipText, accent ? styles.chipTextAccent : styles.chipTextNeutral]}>
        {WORKOUT_TRAINING_DAY_TYPE_LABEL[type]}
      </Text>
    </View>
  );
}

export function WorkoutScheduleCard({
  schedule,
}: {
  schedule: WorkoutScheduleDay[];
}): React.ReactElement {
  return (
    <ProgramSectionCard
      title="Weekly Schedule"
      subtitle="Seven-day split with training day types."
      testID="workout-schedule-card"
    >
      <View style={styles.rows}>
        {schedule.map((day, index) => (
          <View
            key={day.weekday}
            style={[styles.row, index === schedule.length - 1 && styles.rowLast]}
            accessibilityLabel={`${day.weekday}: ${day.sessionName ?? WORKOUT_TRAINING_DAY_TYPE_LABEL[day.type]}`}
          >
            <View style={styles.left}>
              <Text style={styles.weekday}>{day.weekday}</Text>
              {day.sessionName ? (
                <Text style={styles.session}>{day.sessionName}</Text>
              ) : null}
            </View>
            <TypeChip type={day.type} />
          </View>
        ))}
      </View>
    </ProgramSectionCard>
  );
}

const styles = StyleSheet.create({
  rows: {},
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI_BORDER_HAIRLINE,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  left: {
    flex: 1,
    gap: 2,
  },
  weekday: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  session: {
    fontSize: 13,
    color: UI_TEXT_SECONDARY,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipAccent: {
    backgroundColor: SYSTEM_ACCENT_FILL_14,
  },
  chipNeutral: {
    backgroundColor: UI_SURFACE_PRESSED,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextAccent: {
    color: SYSTEM_ACCENT,
  },
  chipTextNeutral: {
    color: UI_TEXT_SECONDARY,
  },
});
