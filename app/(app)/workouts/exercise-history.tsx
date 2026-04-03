/**
 * Exercise History — premium per-exercise training history.
 * Navigated from "Last" summary tap in workout logger. Data from lib/workouts/memory/exerciseHistory + useExerciseHistory (no Firebase/API).
 * Bodyweight for BW ratio from useWeightSeries (lib/data). No native header; custom top bar.
 */

import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useExerciseHistory } from "@/lib/workouts/hooks/useExerciseHistory";
import { useWeightSeries } from "@/lib/data/useWeightSeries";
import { ExerciseProgressChart } from "@/lib/ui/ExerciseProgressChart";
import { WorkoutsNavBar } from "@/lib/ui/headers/WorkoutsNavBar";
import { LoadingState, EmptyState, ErrorState } from "@/lib/ui/ScreenStates";
import type { ExerciseHistorySession, ExerciseHistorySet } from "@/lib/workouts/memory/exerciseHistory";
import { listCustomExercises } from "@/lib/workouts/exercises/customExerciseStore";
import { resolveExerciseDisplayName } from "@/lib/workouts/exercises/displayName";
import {
  resolveStrengthLoggingType,
  type StrengthLoggingType,
} from "@/lib/workouts/exercises/loggingType";
import {
  formatStrengthSetTableCells,
  LB_PER_KG,
} from "@/lib/workouts/strengthSetDisplay";
import { SYSTEM_ACCENT, SYSTEM_METRIC_SECONDARY } from "@/lib/ui/theme/systemAccent";

/** Primary vs secondary series for load vs volume numerics (not module brand colors). */
const metricStrength = SYSTEM_ACCENT;
const metricVolume = SYSTEM_METRIC_SECONDARY;

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return "—";
  }
}

/**
 * Best Actual Lift: from all logged sets, the set with highest weight; tie-break by highest reps.
 * Format: "<weight> lb × <reps>". Uses existing LB_PER_KG and table weight convention (1 decimal).
 */
function selectBestActualLift(
  sessions: ExerciseHistorySession[],
): { weightLb: number; reps: number } | null {
  let best: { loadKg: number; reps: number } | null = null;
  for (const session of sessions) {
    for (const set of session.sets) {
      const loadKg = set.loadKg;
      if (loadKg == null || loadKg <= 0) continue;
      if (
        best == null ||
        loadKg > best.loadKg ||
        (loadKg === best.loadKg && set.reps > best.reps)
      ) {
        best = { loadKg, reps: set.reps };
      }
    }
  }
  if (best == null) return null;
  return {
    weightLb: best.loadKg * LB_PER_KG,
    reps: best.reps,
  };
}

function SessionTableHeader({ loggingType }: { loggingType: StrengthLoggingType }) {
  const noLoad = loggingType !== "weight_reps";
  return (
    <View style={styles.tableHeaderRow}>
      <Text style={[styles.tableHeaderCell, styles.tableColSet]}>Set</Text>
      <Text style={[styles.tableHeaderCell, styles.tableColReps]}>Reps</Text>
      <Text style={[styles.tableHeaderCell, styles.tableColWeight]}>
        {loggingType === "bodyweight_reps" ? "Load" : noLoad ? "Type" : "Weight"}
      </Text>
      <Text style={[styles.tableHeaderCell, styles.tableColRpe]}>RPE</Text>
      <Text style={[styles.tableHeaderCell, styles.tableColE1rm]}>{noLoad ? "Best" : "e1RM"}</Text>
      <Text style={[styles.tableHeaderCell, styles.tableColVol]}>{noLoad ? "Session" : "Vol"}</Text>
    </View>
  );
}

function SetTableRow({ set, loggingType }: { set: ExerciseHistorySet; loggingType: StrengthLoggingType }) {
  const cells = formatStrengthSetTableCells({
    ordinal: set.ordinal,
    reps: set.reps,
    loadKg: set.loadKg,
    rpe: set.rpe,
  });

  const bwLoadLabel =
    set.loadKg != null && set.loadKg > 0
      ? `BW + ${(set.loadKg * LB_PER_KG).toFixed(1)} lb`
      : "BW";
  return (
    <View style={styles.setRow}>
      <Text style={[styles.tableCell, styles.tableColSet]}>{cells.setLabel}</Text>
      <Text style={[styles.tableCell, styles.tableColReps]}>{cells.repsLabel}</Text>
      <Text style={[styles.tableCell, styles.tableColWeight]}>
        {loggingType === "weight_reps" ? cells.weightLabel : loggingType === "bodyweight_reps" ? bwLoadLabel : "Reps"}
      </Text>
      <Text style={[styles.tableCell, styles.tableColRpe]}>{cells.rpeLabel}</Text>
      <Text style={[styles.tableCell, styles.tableCellE1rm]}>
        {loggingType === "weight_reps" ? cells.e1RmLbLabel : String(set.reps)}
      </Text>
      <Text style={[styles.tableCell, styles.tableCellVol]}>
        {loggingType === "weight_reps" ? cells.volLbLabel : "—"}
      </Text>
    </View>
  );
}

type ChartTab = "bestLift" | "volume";

function ChartTabBar({
  value,
  onChange,
  loggingType,
}: {
  value: ChartTab;
  onChange: (t: ChartTab) => void;
  loggingType: StrengthLoggingType;
}) {
  const leftLabel = loggingType === "weight_reps" ? "Best Lift" : "Best Reps";
  const rightLabel = loggingType === "weight_reps" ? "Volume" : "Total Reps";
  return (
    <View style={styles.tabBar}>
      <Pressable
        style={[styles.tab, value === "bestLift" && styles.tabActive]}
        onPress={() => onChange("bestLift")}
        accessibilityRole="tab"
        accessibilityState={{ selected: value === "bestLift" }}
        accessibilityLabel="Best Lift trend"
      >
        <Text style={[styles.tabText, value === "bestLift" && styles.tabTextActive]}>
          {leftLabel}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.tab, value === "volume" && styles.tabActive]}
        onPress={() => onChange("volume")}
        accessibilityRole="tab"
        accessibilityState={{ selected: value === "volume" }}
        accessibilityLabel="Volume trend"
      >
        <Text style={[styles.tabText, value === "volume" && styles.tabTextActive]}>
          {rightLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function SessionBlock({
  session,
  loggingType,
}: {
  session: ExerciseHistorySession;
  loggingType: StrengthLoggingType;
}) {
  const volumeLb = session.volumeKg * LB_PER_KG;
  const sortedSets = [...session.sets].sort((a, b) => a.ordinal - b.ordinal);

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionDate}>{formatDate(session.startedAt)}</Text>
        <View style={styles.sessionMeta}>
          {loggingType === "weight_reps" && volumeLb >= 1 ? (
            <>
              <Text style={styles.sessionVolValue}>{Math.round(volumeLb)}</Text>
              <Text style={styles.sessionMetaLabel}> lb vol</Text>
            </>
          ) : loggingType !== "weight_reps" ? (
            <Text style={styles.sessionMetaLabel}>{`${session.totalReps} reps`}</Text>
          ) : (
            <Text style={styles.sessionMetaLabel}>—</Text>
          )}
        </View>
      </View>
      <View style={styles.sessionTable}>
        <SessionTableHeader loggingType={loggingType} />
        {sortedSets.length === 0 ? (
          <Text style={styles.setRowPlaceholder}>—</Text>
        ) : (
          sortedSets.map((s) => <SetTableRow key={`${s.ordinal}-${s.occurredAt}`} set={s} loggingType={loggingType} />)
        )}
      </View>
    </View>
  );
}

function MetricCell({
  label,
  value,
  unavailable,
  unavailableReason,
  accent,
}: {
  label: string;
  value: string | number | null;
  unavailable?: boolean;
  unavailableReason?: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricLabel}>{label}</Text>
      {unavailable ? (
        <Text style={styles.metricUnavailable}>
          {unavailableReason ?? "—"}
        </Text>
      ) : (
        <Text style={accent ? styles.metricValueAccent : styles.metricValue}>{value ?? "—"}</Text>
      )}
    </View>
  );
}

export default function ExerciseHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ exerciseId?: string }>();
  const exerciseId = typeof params.exerciseId === "string" ? params.exerciseId.trim() || null : null;
  const { user, initializing } = useAuth();
  const [loggingType, setLoggingType] = useState<StrengthLoggingType>("weight_reps");
  const [customExerciseNameById, setCustomExerciseNameById] = useState<ReadonlyMap<string, string>>(
    () => new Map(),
  );
  useEffect(() => {
    if (!exerciseId || !user || initializing) return;
    let cancelled = false;
    listCustomExercises(user.uid)
      .then((rows) => {
        if (cancelled) return;
        setCustomExerciseNameById(new Map(rows.map((row) => [row.exerciseId, row.name])));
        const row = rows.find((x) => x.exerciseId === exerciseId);
        setLoggingType(resolveStrengthLoggingType(exerciseId, row?.loggingType));
      })
      .catch(() => {
        if (!cancelled) {
          setCustomExerciseNameById(new Map());
          setLoggingType("weight_reps");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [exerciseId, user, initializing]);
  const history = useExerciseHistory(exerciseId, loggingType);
  const weightSeries = useWeightSeries("30D");
  const [chartTab, setChartTab] = useState<ChartTab>("bestLift");

  const sessions = history.status === "ready" ? history.data.sessions : [];

  const bestLiftPoints = useMemo(() => {
    if (loggingType !== "weight_reps") {
      const points = sessions
        .filter((s) => s.bestSetReps > 0)
        .map((s) => ({ dateIso: s.startedAt, valueKg: s.bestSetReps }));
      return [...points].sort((a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime());
    }
    const withE1 = sessions
      .filter((s): s is ExerciseHistorySession & { bestE1RmKg: number } => s.bestE1RmKg != null)
      .map((s) => ({ dateIso: s.startedAt, valueKg: s.bestE1RmKg }));
    return [...withE1].sort(
      (a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime(),
    );
  }, [sessions, loggingType]);

  const volumePoints = useMemo(() => {
    if (loggingType !== "weight_reps") {
      const points = sessions
        .filter((s) => s.totalReps > 0)
        .map((s) => ({ dateIso: s.startedAt, valueKg: s.totalReps }));
      return [...points].sort((a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime());
    }
    const withVol = sessions
      .filter((s) => s.volumeKg > 0)
      .map((s) => ({ dateIso: s.startedAt, valueKg: s.volumeKg }));
    return [...withVol].sort(
      (a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime(),
    );
  }, [sessions, loggingType]);

  const bestActualLift = useMemo(() => selectBestActualLift(sessions), [sessions]);
  const bestActualLiftFormatted =
    bestActualLift != null
      ? `${bestActualLift.weightLb.toFixed(1)} lb × ${bestActualLift.reps}`
      : null;

  const displayName =
    exerciseId != null
      ? resolveExerciseDisplayName(exerciseId, customExerciseNameById)
      : null;

  const latestWeightKg =
    weightSeries.status === "ready" && weightSeries.data?.latest?.weightKg != null
      ? weightSeries.data.latest.weightKg
      : null;

  const topBar = (
    <WorkoutsNavBar
      title={displayName ?? exerciseId ?? "Exercise"}
      onBackPress={() => router.back()}
      testID="exercise-history-back"
    />
  );

  if (!exerciseId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.screen}>
          {topBar}
          <View style={styles.content}>
            <EmptyState title="No exercise selected" description="Open this screen from a workout." />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!initializing && !user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.screen}>
          {topBar}
          <View style={styles.content}>
            <EmptyState title="Sign in required" description="Sign in to view exercise history." />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (history.status === "partial") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.screen}>
          {topBar}
          <View style={styles.content}>
            <LoadingState message="Loading history…" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (history.status === "error") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.screen}>
          {topBar}
          <View style={styles.content}>
            <ErrorState message={history.error} onRetry={history.refetch} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const data = history.data;
  const isEmpty = data.sessions.length === 0;

  const bwRatio =
    data.summary.bestE1RmKg != null &&
    latestWeightKg != null &&
    latestWeightKg > 0
      ? data.summary.bestE1RmKg / latestWeightKg
      : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.screen}>
        {topBar}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={history.refetch} />
          }
        >
          {isEmpty ? (
            <EmptyState
              title="No history yet"
              description="Complete a workout with this exercise to see it here."
            />
          ) : (
            <>
              <View style={styles.chartCard}>
                <ChartTabBar value={chartTab} onChange={setChartTab} loggingType={loggingType} />
                {chartTab === "bestLift" ? (
                  <ExerciseProgressChart
                    points={bestLiftPoints}
                    showPlaceholder={false}
                    placeholderMessage={
                      loggingType === "weight_reps"
                        ? "Log more sessions to see e1RM trend"
                        : "Log more sessions to see best reps trend"
                    }
                    lineColor={metricStrength}
                  />
                ) : (
                  <ExerciseProgressChart
                    points={volumePoints}
                    showPlaceholder={false}
                    placeholderMessage={
                      loggingType === "weight_reps"
                        ? "Log more sessions to see volume trend"
                        : "Log more sessions to see total reps trend"
                    }
                    lineColor={metricVolume}
                  />
                )}
              </View>

              <View style={styles.metricsCard}>
                <Text style={styles.metricsTitle}>
                  {loggingType === "weight_reps" ? "Strength metrics" : "Reps metrics"}
                </Text>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricsRow}>
                    {loggingType === "weight_reps" ? (
                      <>
                        <MetricCell
                          label="Best e1RM"
                          value={
                            data.summary.bestE1RmKg != null
                              ? `${Math.round(data.summary.bestE1RmKg * LB_PER_KG)} lb`
                              : null
                          }
                          accent
                        />
                        <MetricCell
                          label="Best BW Ratio"
                          value={bwRatio != null ? bwRatio.toFixed(2) : null}
                          unavailable={bwRatio == null}
                          unavailableReason={latestWeightKg == null ? "Log weight in Body" : "—"}
                        />
                      </>
                    ) : (
                      <>
                        <MetricCell label="Best Set Reps" value={data.summary.bestSetReps ?? "—"} accent />
                        <MetricCell label="Best Session Reps" value={data.summary.bestSessionReps ?? "—"} />
                      </>
                    )}
                  </View>
                  <View style={styles.metricsRow}>
                    <MetricCell label="Sessions" value={data.summary.totalSessions} />
                    <MetricCell
                      label={loggingType === "weight_reps" ? "Best Actual Lift" : "Last Summary"}
                      value={loggingType === "weight_reps" ? (bestActualLiftFormatted ?? "—") : (data.summary.lastSummaryText ?? "—")}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Recent sessions</Text>
              {data.sessions.map((session) => (
                <SessionBlock key={session.sessionId} session={session} loggingType={loggingType} />
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F2F2F7" },
  screen: { flex: 1 },
  content: { flex: 1, padding: 16 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#E5E5EA",
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: "rgba(0, 122, 255, 0.2)",
  },
  tabText: { fontSize: 15, fontWeight: "600", color: "#6E6E73" },
  tabTextActive: { color: "#0051D5", fontWeight: "700" },
  chartCard: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5EA",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  metricsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5EA",
  },
  metricsTitle: { fontSize: 12, fontWeight: "700", color: "#8E8E93", letterSpacing: 0.4, marginBottom: 16, textTransform: "uppercase" as const },
  metricsGrid: { gap: 20 },
  metricsRow: { flexDirection: "row", gap: 16 },
  metricCell: { flex: 1 },
  metricLabel: { fontSize: 13, fontWeight: "600", color: "#8E8E93", marginBottom: 4 },
  metricValue: { fontSize: 20, fontWeight: "700", color: "#1C1C1E" },
  metricValueAccent: { fontSize: 20, fontWeight: "600", color: metricStrength },
  metricUnavailable: { fontSize: 15, color: "#8E8E93", fontWeight: "500" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#2C2C2E", marginBottom: 10 },
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5EA",
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sessionDate: { fontSize: 15, fontWeight: "700", color: "#1C1C1E" },
  sessionMeta: { flexDirection: "row", alignItems: "center" },
  sessionMetaLabel: { fontSize: 14, fontWeight: "500", color: "#6E6E73" },
  sessionVolValue: { fontSize: 14, fontWeight: "600", color: metricVolume },
  sessionTable: { marginTop: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
    marginBottom: 4,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#8E8E93",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F2F2F7",
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: "#1C1C1E",
    textAlign: "center",
  },
  tableColSet: { flex: 1 },
  tableColReps: { flex: 1 },
  tableColWeight: { flex: 1 },
  tableColRpe: { flex: 1 },
  tableColE1rm: { flex: 1 },
  tableColVol: { flex: 1 },
  tableCellE1rm: { fontWeight: "600", color: metricStrength },
  tableCellVol: { fontWeight: "600", color: metricVolume },
  setRowPlaceholder: { fontSize: 15, color: "#8E8E93", fontStyle: "italic", paddingVertical: 8, paddingHorizontal: 4 },
});
