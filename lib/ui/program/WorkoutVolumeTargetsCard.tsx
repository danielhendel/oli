// lib/ui/program/WorkoutVolumeTargetsCard.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { MuscleVolumeTarget } from "@/lib/data/program/workoutBuilderTypes";
import { ProgramSectionCard } from "@/lib/ui/program/ProgramSectionCard";
import {
  UI_BORDER_HAIRLINE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export function WorkoutVolumeTargetsCard({
  targets,
}: {
  targets: MuscleVolumeTarget[];
}): React.ReactElement {
  return (
    <ProgramSectionCard
      title="Weekly Volume Targets"
      subtitle="Target working sets per muscle, per week."
      testID="workout-volume-targets-card"
    >
      <View style={styles.grid}>
        {targets.map((target) => (
          <View
            key={target.muscle}
            style={styles.item}
            accessibilityLabel={`${target.label}: ${target.targetSetsPerWeek} sets per week`}
          >
            <Text style={styles.muscle} numberOfLines={1}>
              {target.label}
            </Text>
            <View style={styles.valueRow}>
              <Text style={styles.value}>{target.targetSetsPerWeek}</Text>
              <Text style={styles.unit}>sets/wk</Text>
            </View>
          </View>
        ))}
      </View>
    </ProgramSectionCard>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  item: {
    width: "50%",
    minHeight: 44,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI_BORDER_HAIRLINE,
  },
  muscle: {
    flexShrink: 1,
    fontSize: 14,
    color: UI_TEXT_SECONDARY,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    fontVariant: ["tabular-nums"],
  },
  unit: {
    fontSize: 11,
    color: UI_TEXT_MUTED,
  },
});
