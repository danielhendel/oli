import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ScreenContainer, LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { useWorkoutDayDetail } from "@/lib/data/workouts/useWorkoutsCalendar";
import type { DayKey } from "@/lib/ui/calendar/types";
import {
  formatIntegerWithCommas,
  formatWorkoutTimeLabel,
  formatWorkoutDurationLabel,
  resolveWorkoutDisplay,
  resolveWorkoutDisplayDurationMinutes,
} from "@/lib/data/workouts/workoutDisplay";
import { useWorkoutOverrides } from "@/lib/data/workouts/workoutOverrides";
import { reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import { WorkoutActionSheet } from "@/lib/ui/WorkoutActionSheet";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { WORKOUT_STRENGTH_COLOR } from "@/lib/ui/calendar/WorkoutDayRing";
import { useAuth } from "@/lib/auth/AuthProvider";
import { listManualWorkoutDaySummaries, type ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";

const useLocalSearchParamsSafe: typeof useLocalSearchParams =
  typeof useLocalSearchParams === "function"
    ? useLocalSearchParams
    : ((() => ({})) as typeof useLocalSearchParams);

function formatHeaderDate(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return dayKey;
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" }).replace(",", "");
  const rest = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${weekday} ${rest}`;
}

function formatMiles(representative: { id: string }): string {
  void representative;
  return "—";
}

function formatAvgPace(representative: { id: string }): string {
  void representative;
  return "—";
}

export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

export function formatWeightLbs(kg: number | null | undefined): string {
  if (!kg) return "—";
  const lbs = kgToLbs(kg);
  return `${Math.round(lbs)}`;
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function toExerciseIdFromName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "_");
}

export default function WorkoutDayScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParamsSafe<{ day?: string }>();
  const dayParam = params.day ?? "";
  const isDayKey = /^\d{4}-\d{2}-\d{2}$/.test(dayParam);
  const day = (isDayKey ? dayParam : "1970-01-01") as DayKey;
  const detail = useWorkoutDayDetail(day);
  const workouts = detail.status === "ready" ? detail.workouts : [];
  const dailyFacts = detail.status === "ready" ? detail.dailyFacts : null;
  const sessions = reconcileWorkoutSessionsForDay(day, workouts);
  const workoutIds = workouts.map((w) => w.id);
  const { overridesByWorkoutId } = useWorkoutOverrides(workoutIds);
  const [menuOpen, setMenuOpen] = useState(false);
  const [manualDaySummary, setManualDaySummary] = useState<ManualWorkoutDaySummary | null>(null);

  const primarySession = useMemo(() => sessions[0] ?? null, [sessions]);
  const primaryWorkout = primarySession?.workouts[0] ?? null;

  useEffect(() => {
    if (!isDayKey) return;
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: formatHeaderDate(day),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      headerRight: () => (
        <Text
          accessibilityRole="button"
          accessibilityLabel="Workout day actions"
          onPress={() => setMenuOpen(true)}
          style={styles.headerMenuText}
        >
          •••
        </Text>
      ),
    });
  }, [day, isDayKey, navigation]);

  useEffect(() => {
    let cancelled = false;
    if (process.env.JEST_WORKER_ID) return;
    if (!isDayKey) return;
    if (!user?.uid) {
      setManualDaySummary(null);
      return;
    }
    void listManualWorkoutDaySummaries(user.uid).then((all) => {
      if (cancelled) return;
      setManualDaySummary(all.find((s) => s.day === day) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, day, isDayKey]);

  if (!isDayKey) {
    return (
      <ScreenContainer backgroundColor="#F2F2F7" padded={false}>
        <ErrorState message="Invalid day parameter" />
      </ScreenContainer>
    );
  }

  if (detail.status === "partial") {
    return (
      <ScreenContainer backgroundColor="#F2F2F7" padded={false}>
        <LoadingState message="Loading workouts…" />
      </ScreenContainer>
    );
  }

  if (detail.status === "error") {
    return (
      <ScreenContainer backgroundColor="#F2F2F7" padded={false}>
        <ErrorState
          message={detail.error}
          requestId={detail.requestId}
          onRetry={() => {
            // React Navigation will re-render and re-call the hook.
          }}
        />
      </ScreenContainer>
    );
  }

  if (workouts.length === 0 && !dailyFacts) {
    return (
      <ScreenContainer backgroundColor="#F2F2F7" padded={false}>
        <EmptyState
          title="No workouts for this day"
          description="When workouts are imported or logged for this day, they will automatically appear here."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor="#F2F2F7" padded={false}>
      <View style={styles.pageBackground}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {dailyFacts && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Daily metrics</Text>
            {dailyFacts.activity && (
              <>
                {typeof dailyFacts.activity.steps === "number" && (
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Steps</Text>
                    <Text style={styles.metricValue}>{Math.round(dailyFacts.activity.steps)}</Text>
                  </View>
                )}
                {typeof dailyFacts.activity.trainingLoad === "number" && (
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Training load</Text>
                    <Text style={styles.metricValue}>{Math.round(dailyFacts.activity.trainingLoad)}</Text>
                  </View>
                )}
              </>
            )}
            {dailyFacts.strength && (
              <>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Strength sessions</Text>
                  <Text style={styles.metricValue}>{dailyFacts.strength.workoutsCount}</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Total sets</Text>
                  <Text style={styles.metricValue}>{dailyFacts.strength.totalSets}</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Total reps</Text>
                  <Text style={styles.metricValue}>{dailyFacts.strength.totalReps}</Text>
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.summarySection}>
          {sessions.length === 0 ? (
            <Text style={styles.placeholder}>No workouts from RawEvents for this day.</Text>
          ) : (
            sessions.map((session) => {
              const representative = session.workouts[0];
              if (!representative) return null;
              const timeLabel = formatWorkoutTimeLabel(session.start ?? representative.start ?? representative.observedAt);
              const resolved = resolveWorkoutDisplay(representative, overridesByWorkoutId[representative.id] ?? null);
              const duration = formatWorkoutDurationLabel(
                resolveWorkoutDisplayDurationMinutes({
                  overrideDurationMinutes: resolved.displayDurationMinutes,
                  sessionDurationMinutes: session.durationMinutes,
                  fallbackWorkoutDurationMinutes: representative.durationMinutes,
                }),
              );
              const calories = typeof session.calories === "number" ? `${Math.round(session.calories)} kcal` : "—";
              const isStrength =
                resolved.displayWorkoutType === "strength" ||
                session.sessionType === "strength" ||
                session.sessionType === "mixed";
              return (
                <View key={session.id} style={styles.summaryBlock}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeaderTitle} numberOfLines={1}>
                      {manualDaySummary?.customName && representative.sourceId === "manual"
                        ? manualDaySummary.customName
                        : resolved.displayTitle}
                    </Text>
                    <Text style={styles.sectionHeaderTime}>{timeLabel}</Text>
                  </View>
                  <View style={styles.workoutCard} testID={`summary-card-${session.id}`}>
                    <View style={styles.kpiRow}>
                      <View style={styles.kpiCell}>
                        <Text style={styles.kpiLabel}>Duration</Text>
                        <Text style={styles.kpiValue}>{duration}</Text>
                      </View>
                      <View style={styles.kpiCell}>
                        <Text style={styles.kpiLabel}>Calories</Text>
                        <Text style={styles.kpiValue}>{calories}</Text>
                      </View>
                    </View>
                    <View style={styles.kpiRow}>
                      <View style={styles.kpiCell}>
                        <Text style={styles.kpiLabel}>{isStrength ? "Total Volume" : "Distance"}</Text>
                        <Text style={styles.kpiValue}>
                          {isStrength
                            ? formatIntegerWithCommas(manualDaySummary?.totalVolume ?? null)
                            : formatMiles(representative)}
                        </Text>
                      </View>
                      <View style={styles.kpiCell}>
                        <Text style={styles.kpiLabel}>{isStrength ? "Avg Intensity" : "Avg Pace"}</Text>
                        <Text style={styles.kpiValue}>
                          {isStrength
                            ? typeof manualDaySummary?.avgIntensity === "number"
                              ? manualDaySummary.avgIntensity.toFixed(1)
                              : "—"
                            : formatAvgPace(representative)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
        <View style={styles.exercisesSection}>
          <Text style={styles.sectionHeaderTitle}>Exercises</Text>
          {!manualDaySummary || manualDaySummary.exercises.length === 0 ? (
            <View style={styles.card}>
            <Text style={styles.placeholder}>No logged exercises</Text>
            </View>
          ) : (
            manualDaySummary.exercises.map((exercise) => (
              <View key={exercise.name} style={styles.exerciseCard} testID={`exercise-card-${exercise.name}`}>
                <View style={styles.exerciseTitleRow}>
                  <Text style={styles.exerciseName}>{toTitleCase(exercise.name)}</Text>
                  <Text
                    accessibilityRole="button"
                    accessibilityLabel={`Exercise history for ${exercise.name}`}
                    onPress={() => {
                      router.push({
                        pathname: "/(app)/workouts/exercise-history",
                        params: { exerciseId: toExerciseIdFromName(exercise.name) },
                      });
                    }}
                    style={styles.exerciseHistoryButton}
                  >
                    History
                  </Text>
                </View>
                <View style={styles.exerciseHeaderRow}>
                  <Text style={[styles.exerciseHeaderCell, styles.colSet]}>Set</Text>
                  <Text style={[styles.exerciseHeaderCell, styles.colReps]}>Reps</Text>
                  <Text style={[styles.exerciseHeaderCell, styles.colWeight]}>Weight (lb)</Text>
                  <Text style={[styles.exerciseHeaderCell, styles.colIntensity]}>Intensity</Text>
                </View>
                {exercise.sets.map((set) => (
                  <View key={`${exercise.name}-${set.setNumber}`} style={styles.exerciseSetRow}>
                    <Text style={[styles.exerciseCell, styles.colSet]}>{set.setNumber}</Text>
                    <Text style={[styles.exerciseCell, styles.colReps]}>{set.reps ?? "—"}</Text>
                    <Text style={[styles.exerciseCell, styles.colWeight]}>
                      {formatWeightLbs(set.weightKg)}
                    </Text>
                    <Text style={[styles.exerciseCell, styles.colIntensity]}>
                      {typeof set.intensity === "number" ? set.intensity : "—"}
                    </Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
      <WorkoutActionSheet
        visible={menuOpen && !!primaryWorkout}
        anchor={null}
        onClose={() => setMenuOpen(false)}
        onViewDetails={() => {
          setMenuOpen(false);
          router.push({ pathname: "/(app)/workouts/day/[day]", params: { day } });
        }}
        onDoItAgain={() => {
          setMenuOpen(false);
          router.push("/(app)/workouts/log");
        }}
        onRename={() => {
          if (!primaryWorkout) return;
          const resolved = resolveWorkoutDisplay(primaryWorkout, overridesByWorkoutId[primaryWorkout.id] ?? null);
          setMenuOpen(false);
          router.push({
            pathname: "/(app)/workouts/edit/rename",
            params: { workoutId: primaryWorkout.id, currentTitle: resolved.displayTitle },
          });
        }}
        onEditDuration={() => {
          if (!primaryWorkout) return;
          const resolved = resolveWorkoutDisplay(primaryWorkout, overridesByWorkoutId[primaryWorkout.id] ?? null);
          setMenuOpen(false);
          router.push({
            pathname: "/(app)/workouts/edit/duration",
            params: {
              workoutId: primaryWorkout.id,
              currentDurationMinutes:
                typeof resolved.displayDurationMinutes === "number"
                  ? String(Math.round(resolved.displayDurationMinutes))
                  : "",
            },
          });
        }}
        onEditType={() => {
          if (!primaryWorkout) return;
          const resolved = resolveWorkoutDisplay(primaryWorkout, overridesByWorkoutId[primaryWorkout.id] ?? null);
          setMenuOpen(false);
          router.push({
            pathname: "/(app)/workouts/edit/type",
            params: { workoutId: primaryWorkout.id, currentWorkoutType: resolved.displayWorkoutType },
          });
        }}
      />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 0,
  },
  pageBackground: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5EA",
    marginBottom: 16,
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryBlock: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  placeholder: {
    fontSize: 14,
    color: "#8E8E93",
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 15,
    color: "#3C3C43",
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  workoutCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1C1C1E",
    flex: 1,
    marginRight: 8,
  },
  sectionHeaderTime: {
    fontSize: 16,
    color: "#8E8E93",
    fontWeight: "500",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
  },
  kpiCell: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 2,
  },
  kpiLabel: {
    fontSize: 13,
    color: "#8E8E93",
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FF3B30",
  },
  headerMenuText: {
    fontSize: 18,
    color: "#1C1C1E",
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exercisesSection: {
    marginTop: 8,
  },
  exerciseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    gap: 6,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5EA",
  },
  exerciseTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    flex: 1,
    marginRight: 8,
  },
  exerciseHistoryButton: {
    fontSize: 15,
    fontWeight: "600",
    color: "#007AFF",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  exerciseHeaderRow: {
    flexDirection: "row",
    width: "100%",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
    paddingBottom: 6,
  },
  exerciseSetRow: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F2F2F7",
  },
  exerciseHeaderCell: {
    fontSize: 15,
    color: "#8E8E93",
    fontWeight: "600",
    textAlign: "center",
  },
  exerciseCell: {
    fontSize: 17,
    color: WORKOUT_STRENGTH_COLOR,
    fontWeight: "700",
    textAlign: "center",
  },
  colSet: { flex: 1, alignItems: "center", justifyContent: "center" },
  colReps: { flex: 1, alignItems: "center", justifyContent: "center" },
  colWeight: { flex: 1, alignItems: "center", justifyContent: "center" },
  colIntensity: { flex: 1, alignItems: "center", justifyContent: "center" },
});
