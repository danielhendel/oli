// app/debug/exercise-intelligence.tsx
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  buildExerciseIntelligenceAuditModel,
  MAJOR_HYPERTROPHY_REGION_KEYS,
  type ExerciseIntelligenceAuditRankedExercise,
} from "@/lib/workouts/exercises/intelligence/buildExerciseIntelligenceAuditModel";

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatScore(value: number): string {
  return value.toFixed(3);
}

function RankedList({
  title,
  rows,
}: {
  title: string;
  rows: readonly ExerciseIntelligenceAuditRankedExercise[];
}): React.ReactElement {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.map((row, index) => (
        <Text key={row.exerciseId} style={styles.rowText} selectable>
          {index + 1}. {row.exerciseId} — {formatScore(row.score)}
        </Text>
      ))}
    </View>
  );
}

export default function DebugExerciseIntelligenceScreen(): React.ReactElement {
  const model = useMemo(() => buildExerciseIntelligenceAuditModel(), []);

  const scoringStatus =
    model.scoringAuditIssueCount === 0
      ? "PASS (0 issues)"
      : `FAIL (${model.scoringAuditIssueCount} issues)`;

  return (
    <ScrollView contentContainerStyle={styles.content} testID="debug-exercise-intelligence-screen">
      <Text style={styles.title}>Exercise Intelligence Audit</Text>
      <Text style={styles.subtitle}>Hypertrophy Core v1 · internal dev only</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Core 100 coverage</Text>
        <Text style={styles.rowText}>Library exercises: {model.totalLibraryExercises}</Text>
        <Text style={styles.rowText}>Seeded intelligence: {model.seededIntelligenceCount}</Text>
        <Text style={styles.rowText}>Coverage: {formatPercent(model.coveragePercent)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scoring audit</Text>
        <Text style={styles.rowText}>{scoringStatus}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Region coverage (seeded exercise count)</Text>
        {MAJOR_HYPERTROPHY_REGION_KEYS.map((region) => (
          <Text key={region} style={styles.rowText}>
            {region}: {model.seededByRegion[region]}
          </Text>
        ))}
        {model.missingMajorRegionCoverage.length > 0 ? (
          <Text style={styles.warningText}>
            Missing: {model.missingMajorRegionCoverage.join(", ")}
          </Text>
        ) : (
          <Text style={styles.okText}>All major regions covered</Text>
        )}
      </View>

      <RankedList title="Top 10 SFR" rows={model.topSfrExercises} />
      <RankedList title="Top 10 fatigue" rows={model.highestFatigueExercises} />
      <RankedList title="Top 10 lumbar stress" rows={model.highestJointStressExercises.lumbar} />
      <RankedList
        title="Top 10 shoulder stress"
        rows={model.highestJointStressExercises.shoulder}
      />
      <RankedList title="Top 10 knee stress" rows={model.highestJointStressExercises.knee} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: -8,
  },
  section: {
    gap: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  rowText: {
    fontSize: 13,
    fontFamily: "Menlo",
  },
  okText: {
    fontSize: 13,
    color: "#1b7f3b",
    marginTop: 4,
  },
  warningText: {
    fontSize: 13,
    color: "#b45309",
    marginTop: 4,
  },
});
