// lib/ui/program/WorkoutReviewCard.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { WorkoutReviewSummary } from "@/lib/data/program/workoutBuilderTypes";
import { ProgramSectionCard } from "@/lib/ui/program/ProgramSectionCard";
import {
  UI_SURFACE_PRESSED,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

function SummaryStat({ label, value }: { label: string; value: number }): React.ReactElement {
  return (
    <View style={styles.stat} accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function WorkoutReviewCard({
  review,
}: {
  review: WorkoutReviewSummary;
}): React.ReactElement {
  const saveEnabled = review.saveEnabled;
  return (
    <ProgramSectionCard
      title="Review & Save"
      subtitle="Summary of this program draft."
      testID="workout-review-card"
    >
      <View style={styles.grid}>
        <SummaryStat label="Training days" value={review.trainingDays} />
        <SummaryStat label="Weekly sets" value={review.weeklySets} />
        <SummaryStat label="Cardio sessions" value={review.cardioSessions} />
        <SummaryStat label="Recovery / rest" value={review.recoveryRestDays} />
      </View>

      <Pressable
        testID="workout-save-cta"
        disabled={!saveEnabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !saveEnabled }}
        accessibilityLabel={saveEnabled ? "Save Program" : `Save Program. ${review.saveHint}`}
        style={[styles.saveButton, !saveEnabled && styles.saveButtonDisabled]}
      >
        <Text style={styles.saveButtonText}>Save Program</Text>
        {!saveEnabled ? <Text style={styles.saveHint}>{review.saveHint}</Text> : null}
      </Pressable>
    </ProgramSectionCard>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 14,
  },
  stat: {
    width: "50%",
    gap: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: UI_TEXT_PRIMARY,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 13,
    color: UI_TEXT_SECONDARY,
  },
  saveButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SYSTEM_ACCENT,
    marginTop: 6,
    gap: 2,
  },
  saveButtonDisabled: {
    backgroundColor: UI_SURFACE_PRESSED,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  saveHint: {
    fontSize: 11,
    fontWeight: "600",
    color: UI_TEXT_MUTED,
  },
});
