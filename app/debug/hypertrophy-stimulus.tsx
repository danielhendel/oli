// app/debug/hypertrophy-stimulus.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/lib/auth/AuthProvider";
import { buildHypertrophyStimulusSessionPreviewModel } from "@/lib/debug/hypertrophyStimulusSessionPreview";
import { listManualWorkoutDaySummaries } from "@/lib/workouts/journal/manualWorkoutSummary";
import type { ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";
import type { RegionalStimulusV1 } from "@/lib/workouts/exercises/intelligence/exerciseIntelligenceV1Types";

function formatScore(value: number): string {
  return value.toFixed(3);
}

function RegionList({ stimulusByRegion }: { stimulusByRegion: RegionalStimulusV1 }): React.ReactElement {
  const rows = Object.entries(stimulusByRegion)
    .filter(([, value]) => typeof value === "number" && value > 0)
    .sort((a, b) => {
      const diff = (b[1] as number) - (a[1] as number);
      if (diff !== 0) return diff;
      return a[0].localeCompare(b[0]);
    });

  if (rows.length === 0) {
    return <Text style={styles.rowText}>No regional stimulus</Text>;
  }

  return (
    <>
      {rows.map(([region, value]) => (
        <Text key={region} style={styles.rowText} selectable>
          {region}: {formatScore(value as number)}
        </Text>
      ))}
    </>
  );
}

export default function DebugHypertrophyStimulusScreen(): React.ReactElement {
  const { user, initializing } = useAuth();
  const [sessions, setSessions] = useState<ManualWorkoutDaySummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = await listManualWorkoutDaySummaries(user.uid);
      setSessions(rows);
      setSelectedSessionId((current) => {
        if (current != null && rows.some((row) => row.sessionId === current)) return current;
        return rows[0]?.sessionId ?? null;
      });
    } catch (e) {
      setSessions([]);
      setError(e instanceof Error ? e.message : "Failed to load local workout sessions");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (initializing) return;
    void loadSessions();
  }, [initializing, loadSessions]);

  const model = useMemo(
    () =>
      buildHypertrophyStimulusSessionPreviewModel({
        sessions,
        selectedSessionId,
      }),
    [sessions, selectedSessionId],
  );

  if (initializing || loading) {
    return (
      <View style={styles.centered} testID="debug-hypertrophy-stimulus-loading">
        <ActivityIndicator />
        <Text style={styles.mutedText}>Loading local completed sessions…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered} testID="debug-hypertrophy-stimulus-no-user">
        <Text style={styles.title}>Hypertrophy Stimulus Preview</Text>
        <Text style={styles.mutedText}>Sign in to inspect local completed workout sessions.</Text>
      </View>
    );
  }

  if (error != null) {
    return (
      <View style={styles.centered} testID="debug-hypertrophy-stimulus-error">
        <Text style={styles.title}>Hypertrophy Stimulus Preview</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => void loadSessions()} style={styles.button}>
          <Text>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (model.emptyReason === "no_sessions") {
    return (
      <View style={styles.centered} testID="debug-hypertrophy-stimulus-empty">
        <Text style={styles.title}>Hypertrophy Stimulus Preview</Text>
        <Text style={styles.mutedText}>
          No completed local workout sessions found in the journal. Finish a strength workout to
          preview stimulus here.
        </Text>
        <Pressable onPress={() => void loadSessions()} style={styles.button}>
          <Text>Refresh</Text>
        </Pressable>
      </View>
    );
  }

  const summary = model.summary!;

  return (
    <ScrollView contentContainerStyle={styles.content} testID="debug-hypertrophy-stimulus-screen">
      <Text style={styles.title}>Hypertrophy Stimulus Preview</Text>
      <Text style={styles.subtitle}>Local journal · internal dev only</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sessions</Text>
        {model.availableSessions.map((session) => {
          const selected = session.sessionId === model.selectedSession?.sessionId;
          return (
            <Pressable
              key={session.sessionId}
              testID={`hypertrophy-session-${session.sessionId}`}
              onPress={() => setSelectedSessionId(session.sessionId)}
              style={[styles.sessionRow, selected && styles.sessionRowSelected]}
            >
              <Text style={styles.rowText}>
                {session.label} · {session.day} · {session.exerciseCount} exercises
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session summary</Text>
        <Text style={styles.rowText}>Session: {summary.sessionId}</Text>
        <Text style={styles.rowText}>
          Total stimulus: {formatScore(summary.totalEstimatedStimulus)}
        </Text>
        <Text style={styles.rowText}>Fatigue: {formatScore(summary.estimatedFatigue)}</Text>
        <Text style={styles.rowText}>Recovery demand: {formatScore(summary.recoveryDemand)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Source counts</Text>
        <Text style={styles.rowText}>
          Intelligence: {summary.sourceCounts.hypertrophy_intelligence_v1}
        </Text>
        <Text style={styles.rowText}>Fallback: {summary.sourceCounts.fallback}</Text>
        <Text style={styles.rowText}>Fallback exercises: {model.fallbackExerciseLabel}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top stimulus regions</Text>
        {summary.topStimulusRegions.length === 0 ? (
          <Text style={styles.rowText}>None</Text>
        ) : (
          summary.topStimulusRegions.map((row, index) => (
            <Text key={row.region} style={styles.rowText} selectable>
              {index + 1}. {row.region} — {formatScore(row.stimulus)}
            </Text>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stimulus by region</Text>
        <RegionList stimulusByRegion={summary.stimulusByRegion} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    padding: 16,
    gap: 12,
    justifyContent: "center",
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
  mutedText: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: "#b45309",
    lineHeight: 20,
  },
  button: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
  },
  sessionRow: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  sessionRowSelected: {
    backgroundColor: "#f3f4f6",
  },
});
