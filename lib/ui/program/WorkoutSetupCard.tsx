// lib/ui/program/WorkoutSetupCard.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { WorkoutProgramSetup } from "@/lib/data/program/workoutBuilderTypes";
import { ProgramSectionCard } from "@/lib/ui/program/ProgramSectionCard";
import { UI_BORDER_HAIRLINE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

const TRAINING_LEVEL_LABEL: Record<WorkoutProgramSetup["trainingLevel"], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

function Row({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View style={styles.row} accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function WorkoutSetupCard({ setup }: { setup: WorkoutProgramSetup }): React.ReactElement {
  return (
    <ProgramSectionCard
      title="Program Setup"
      subtitle="Name, goal, and structure for this program."
      testID="workout-setup-card"
    >
      <View style={styles.rows}>
        <Row label="Program name" value={setup.name} />
        <Row label="Goal" value={setup.goal} />
        <Row label="Training level" value={TRAINING_LEVEL_LABEL[setup.trainingLevel]} />
        <Row label="Duration" value={`${setup.durationWeeks} weeks`} />
      </View>
      <View style={styles.notesWrap}>
        <Text style={styles.rowLabel}>Notes</Text>
        <Text style={styles.notes}>{setup.notes}</Text>
      </View>
    </ProgramSectionCard>
  );
}

const styles = StyleSheet.create({
  rows: {
    gap: 0,
  },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI_BORDER_HAIRLINE,
  },
  rowLabel: {
    fontSize: 14,
    color: UI_TEXT_SECONDARY,
  },
  rowValue: {
    flexShrink: 1,
    textAlign: "right",
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  notesWrap: {
    gap: 4,
    marginTop: 4,
  },
  notes: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_PRIMARY,
  },
});
