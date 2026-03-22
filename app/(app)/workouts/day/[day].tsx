import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ScreenContainer, LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { useWorkoutDayDetail } from "@/lib/data/workouts/useWorkoutsCalendar";
import type { DayKey } from "@/lib/ui/calendar/types";
import {
  formatAvgPaceMinPerMileLabel,
  formatIntegerWithCommas,
  formatWorkoutDistanceLabel,
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
import { CARDIO_RED, WORKOUT_STRENGTH_COLOR } from "@/lib/ui/calendar/WorkoutDayRing";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  listManualWorkoutDaySummaries,
  totalVolumeKgForManualExercise,
  type ManualWorkoutDaySummary,
} from "@/lib/workouts/journal/manualWorkoutSummary";
import { formatStrengthSetTableCells, LB_PER_KG } from "@/lib/workouts/strengthSetDisplay";
import { overviewAccentForTab } from "@/lib/ui/workouts/workoutOverviewAnalyticsTheme";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import type { HeartRateZoneMinutes5, WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { WorkoutOverride } from "@/lib/data/workouts/workoutOverrides";

/** Matches exercise-history numeric accents for set grid values. */
const METRIC_STRENGTH_ACCENT = "#FF3B30";
const METRIC_VOLUME_ACCENT = "#34C759";

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

function aggregateHeartRateZoneMinutes(session: ReconciledWorkoutSession): HeartRateZoneMinutes5 | null {
  const sums = [0, 0, 0, 0, 0];
  let any = false;
  for (const w of session.workouts) {
    const z = w.heartRateZoneMinutes;
    if (!z) continue;
    any = true;
    const tuple = z as readonly [number, number, number, number, number];
    for (let i = 0; i < 5; i += 1) {
      const m = tuple[i];
      const add = typeof m === "number" && Number.isFinite(m) && m >= 0 ? m : 0;
      sums[i] = (sums[i] ?? 0) + add;
    }
  }
  return any ? (sums as unknown as HeartRateZoneMinutes5) : null;
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

function isStrengthLikeSession(
  session: ReconciledWorkoutSession,
  representative: WorkoutHistoryItem,
  override: WorkoutOverride | null,
): boolean {
  const resolved = resolveWorkoutDisplay(representative, override);
  return (
    resolved.displayWorkoutType === "strength" ||
    session.sessionType === "strength" ||
    session.sessionType === "mixed"
  );
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
  const [expandedPerformanceRowKey, setExpandedPerformanceRowKey] = useState<string | null>(null);

  const strengthAccent = overviewAccentForTab("strength");

  const { usePremiumStrengthLayout, premiumSessionId } = useMemo(() => {
    const strengthLikes = sessions.filter((session) => {
      const representative = session.workouts[0];
      if (!representative) return false;
      return isStrengthLikeSession(
        session,
        representative,
        overridesByWorkoutId[representative.id] ?? null,
      );
    });
    /**
     * `manualDaySummary` is day-scoped journal data. With multiple strength/mixed
     * reconciled sessions on the same day, we cannot honestly attribute exercises to
     * one session — keep the legacy session + exercises layout.
     */
    const useLayout = strengthLikes.length === 1 && manualDaySummary != null;
    return {
      usePremiumStrengthLayout: useLayout,
      premiumSessionId: useLayout ? strengthLikes[0]!.id : null,
    };
  }, [sessions, overridesByWorkoutId, manualDaySummary]);

  /**
   * Multiple pure-cardio sessions the same day → legacy cards (no per-session zone merge contract).
   * Single cardio session → premium cardio layout (zones optional; empty state if missing).
   */
  const { usePremiumCardioLayout, premiumCardioSessionId } = useMemo(() => {
    const cardioOnly = sessions.filter((s) => s.sessionType === "cardio");
    const useLayout = cardioOnly.length === 1;
    return {
      usePremiumCardioLayout: useLayout,
      premiumCardioSessionId: useLayout ? cardioOnly[0]!.id : null,
    };
  }, [sessions]);

  const singleSessionPremiumCardioDay = sessions.length === 1 && usePremiumCardioLayout;

  const cardioAccent = overviewAccentForTab("cardio");

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

  /** Stack header already sits below status bar; omit top safe-area to avoid a gray band under the nav bar. */
  const screenEdges = ["left", "right", "bottom"] as const;

  if (!isDayKey) {
    return (
      <ScreenContainer backgroundColor="#F2F2F7" padded={false} edges={[...screenEdges]}>
        <ErrorState message="Invalid day parameter" />
      </ScreenContainer>
    );
  }

  if (detail.status === "partial") {
    return (
      <ScreenContainer backgroundColor="#F2F2F7" padded={false} edges={[...screenEdges]}>
        <LoadingState message="Loading workouts…" />
      </ScreenContainer>
    );
  }

  if (detail.status === "error") {
    return (
      <ScreenContainer backgroundColor="#F2F2F7" padded={false} edges={[...screenEdges]}>
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
      <ScreenContainer backgroundColor="#F2F2F7" padded={false} edges={[...screenEdges]}>
        <EmptyState
          title="No workouts for this day"
          description="When workouts are imported or logged for this day, they will automatically appear here."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor="#F2F2F7" padded={false} edges={[...screenEdges]}>
      <View style={styles.pageBackground}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        {...(Platform.OS === "ios"
          ? { contentInsetAdjustmentBehavior: "never" as const }
          : {})}
      >
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
            <Text style={styles.summarySectionPlaceholder}>No workouts from RawEvents for this day.</Text>
          ) : (
            sessions.map((session) => {
              const representative = session.workouts[0];
              if (!representative) return null;
              const timeLabel = formatWorkoutTimeLabel(session.start ?? representative.start ?? representative.observedAt);
              const resolved = resolveWorkoutDisplay(representative, overridesByWorkoutId[representative.id] ?? null);
              const resolvedDurationMinutes = resolveWorkoutDisplayDurationMinutes({
                overrideDurationMinutes: resolved.displayDurationMinutes,
                sessionDurationMinutes: session.durationMinutes,
                fallbackWorkoutDurationMinutes: representative.durationMinutes,
              });
              const duration = formatWorkoutDurationLabel(resolvedDurationMinutes);
              const calories = typeof session.calories === "number" ? `${Math.round(session.calories)} kcal` : "—";
              const isStrength =
                resolved.displayWorkoutType === "strength" ||
                session.sessionType === "strength" ||
                session.sessionType === "mixed";
              const showPremiumBlock =
                usePremiumStrengthLayout && premiumSessionId === session.id && isStrength;
              const showPremiumCardioBlock =
                usePremiumCardioLayout &&
                premiumCardioSessionId === session.id &&
                session.sessionType === "cardio" &&
                !isStrength;

              const titleText =
                manualDaySummary?.customName && representative.sourceId === "manual"
                  ? manualDaySummary.customName
                  : resolved.displayTitle;

              const distanceLabel = formatWorkoutDistanceLabel(representative.distanceMeters ?? null);
              const paceLabel = formatAvgPaceMinPerMileLabel(
                representative.distanceMeters ?? null,
                resolvedDurationMinutes,
              );

              if (showPremiumBlock && manualDaySummary) {
                const exercises = manualDaySummary.exercises;
                const volumesKg = exercises.map((ex) => totalVolumeKgForManualExercise(ex));
                const maxVolKg = Math.max(1, ...volumesKg);

                return (
                  <View key={session.id}>
                    <View style={styles.premiumWorkoutCard} testID={`summary-card-${session.id}`}>
                      <View style={[workoutOverviewInCardHeaderStyles.row, styles.inCardHeaderRowSpacing]}>
                        <View style={styles.strengthOverviewTitleWrap}>
                          <Text style={workoutOverviewInCardHeaderStyles.title} numberOfLines={2}>
                            {titleText}
                          </Text>
                        </View>
                        <Text style={styles.strengthOverviewTime}>{timeLabel}</Text>
                      </View>
                      <View style={styles.overviewMetricsGrid}>
                        <View style={styles.overviewMetricsRow}>
                          <View
                            style={[styles.overviewMetricTile, { backgroundColor: strengthAccent.metricTileBg }]}
                          >
                            <Text style={styles.overviewMetricLabel}>Duration</Text>
                            <Text style={styles.overviewMetricValue}>{duration}</Text>
                          </View>
                          <View
                            style={[styles.overviewMetricTile, { backgroundColor: strengthAccent.metricTileBg }]}
                          >
                            <Text style={styles.overviewMetricLabel}>Calories</Text>
                            <Text style={styles.overviewMetricValue}>{calories}</Text>
                          </View>
                        </View>
                        <View style={styles.overviewMetricsRow}>
                          <View
                            style={[styles.overviewMetricTile, { backgroundColor: strengthAccent.metricTileBg }]}
                          >
                            <Text style={styles.overviewMetricLabel}>Total Volume</Text>
                            <Text style={styles.overviewMetricValue}>
                              {formatIntegerWithCommas(manualDaySummary.totalVolume ?? null)}
                            </Text>
                          </View>
                          <View
                            style={[styles.overviewMetricTile, { backgroundColor: strengthAccent.metricTileBg }]}
                          >
                            <Text style={styles.overviewMetricLabel}>Avg Intensity</Text>
                            <Text style={styles.overviewMetricValue}>
                              {typeof manualDaySummary.avgIntensity === "number"
                                ? manualDaySummary.avgIntensity.toFixed(1)
                                : "—"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.performanceInner}>
                        {exercises.length === 0 ? (
                          <Text style={styles.placeholder}>No logged exercises</Text>
                        ) : (
                          exercises.map((exercise, idx) => {
                            const rowKey = `${idx}:${exercise.name}`;
                            const volKg = volumesKg[idx] ?? 0;
                            const volLb = Math.round(volKg * LB_PER_KG);
                            const volDisplay = volLb >= 1 ? `${volLb.toLocaleString()} lb` : "—";
                            const progress = maxVolKg > 0 ? Math.max(0, Math.min(1, volKg / maxVolKg)) : 0;
                            const expanded = expandedPerformanceRowKey === rowKey;
                            const toggleRow = () =>
                              setExpandedPerformanceRowKey(expanded ? null : rowKey);

                            return (
                              <View key={rowKey} style={styles.performanceRowWrap}>
                                <View style={styles.performanceRowLine1}>
                                  <Pressable
                                    testID={`exercise-performance-row-${idx}`}
                                    accessibilityRole="button"
                                    accessibilityState={{ expanded }}
                                    onPress={toggleRow}
                                    style={styles.performanceRowMainPress}
                                  >
                                    <View style={styles.performanceNameVolRow}>
                                      <Text style={styles.performanceExerciseName} numberOfLines={1}>
                                        {toTitleCase(exercise.name)}
                                      </Text>
                                      <Text style={styles.performanceVolume}>{volDisplay}</Text>
                                    </View>
                                  </Pressable>
                                  <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`Exercise history for ${exercise.name}`}
                                    onPress={() => {
                                      router.push({
                                        pathname: "/(app)/workouts/exercise-history",
                                        params: { exerciseId: toExerciseIdFromName(exercise.name) },
                                      });
                                    }}
                                    hitSlop={8}
                                  >
                                    <Text style={styles.exerciseHistoryButton}>History</Text>
                                  </Pressable>
                                </View>
                                <Pressable onPress={toggleRow} accessibilityRole="button">
                                  <View style={styles.performanceBarTrack}>
                                    <View
                                      style={[
                                        styles.performanceBarFill,
                                        { width: `${progress * 100}%` },
                                      ]}
                                    />
                                  </View>
                                </Pressable>
                                {expanded ? (
                                  <View style={styles.performanceExpanded}>
                                    <View style={styles.perfTableHeaderRow}>
                                      <Text style={styles.perfTableHeaderCell}>Set</Text>
                                      <Text style={styles.perfTableHeaderCell}>Reps</Text>
                                      <Text style={styles.perfTableHeaderCell}>Weight</Text>
                                      <Text style={styles.perfTableHeaderCell}>RPE</Text>
                                      <Text style={styles.perfTableHeaderCell}>e1RM</Text>
                                      <Text style={styles.perfTableHeaderCell}>Vol</Text>
                                    </View>
                                    {exercise.sets.map((set) => {
                                      const cells = formatStrengthSetTableCells({
                                        setNumber: set.setNumber,
                                        reps: set.reps,
                                        weightKg: set.weightKg,
                                        intensity: set.intensity,
                                      });
                                      return (
                                        <View
                                          key={`${rowKey}-set-${set.setNumber}`}
                                          style={styles.perfSetRow}
                                        >
                                          <Text style={[styles.perfTableCell, styles.perfColSet]}>
                                            {cells.setLabel}
                                          </Text>
                                          <Text style={[styles.perfTableCell, styles.perfColReps]}>
                                            {cells.repsLabel}
                                          </Text>
                                          <Text style={[styles.perfTableCell, styles.perfColWeight]}>
                                            {cells.weightLabel}
                                          </Text>
                                          <Text style={[styles.perfTableCell, styles.perfColRpe]}>
                                            {cells.rpeLabel}
                                          </Text>
                                          <Text
                                            style={[
                                              styles.perfTableCell,
                                              styles.perfColE1rm,
                                              { color: METRIC_STRENGTH_ACCENT },
                                            ]}
                                          >
                                            {cells.e1RmLbLabel}
                                          </Text>
                                          <Text
                                            style={[
                                              styles.perfTableCell,
                                              styles.perfColVol,
                                              { color: METRIC_VOLUME_ACCENT },
                                            ]}
                                          >
                                            {cells.volLbLabel}
                                          </Text>
                                        </View>
                                      );
                                    })}
                                  </View>
                                ) : null}
                              </View>
                            );
                          })
                        )}
                      </View>
                    </View>
                  </View>
                );
              }

              if (showPremiumCardioBlock) {
                const zoneMinutes = aggregateHeartRateZoneMinutes(session);
                const maxZoneMin = zoneMinutes ? Math.max(1, ...zoneMinutes) : 1;

                return (
                  <View key={session.id}>
                    <View style={styles.premiumWorkoutCard} testID={`summary-card-${session.id}`}>
                      <View style={[workoutOverviewInCardHeaderStyles.row, styles.inCardHeaderRowSpacing]}>
                        <View style={styles.strengthOverviewTitleWrap}>
                          <Text style={workoutOverviewInCardHeaderStyles.title} numberOfLines={2}>
                            {titleText}
                          </Text>
                        </View>
                        <Text style={styles.strengthOverviewTime}>{timeLabel}</Text>
                      </View>
                      <View style={styles.overviewMetricsGrid}>
                        <View style={styles.overviewMetricsRow}>
                          <View
                            style={[styles.overviewMetricTile, { backgroundColor: cardioAccent.metricTileBg }]}
                          >
                            <Text style={styles.overviewMetricLabel}>Duration</Text>
                            <Text style={styles.overviewMetricValue}>{duration}</Text>
                          </View>
                          <View
                            style={[styles.overviewMetricTile, { backgroundColor: cardioAccent.metricTileBg }]}
                          >
                            <Text style={styles.overviewMetricLabel}>Calories</Text>
                            <Text style={styles.overviewMetricValue}>{calories}</Text>
                          </View>
                        </View>
                        <View style={styles.overviewMetricsRow}>
                          <View
                            style={[styles.overviewMetricTile, { backgroundColor: cardioAccent.metricTileBg }]}
                          >
                            <Text style={styles.overviewMetricLabel}>Distance</Text>
                            <Text style={styles.overviewMetricValue}>{distanceLabel}</Text>
                          </View>
                          <View
                            style={[styles.overviewMetricTile, { backgroundColor: cardioAccent.metricTileBg }]}
                          >
                            <Text style={styles.overviewMetricLabel}>Avg Pace</Text>
                            <Text style={styles.overviewMetricValue}>{paceLabel}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.performanceInner}>
                        <Text style={styles.cardioZonesSectionTitle}>Heart rate zones</Text>
                        {zoneMinutes == null ? (
                          <Text style={styles.placeholder}>
                            Heart rate zones are not available for this workout.
                          </Text>
                        ) : (
                          [1, 2, 3, 4, 5].map((zoneNum, idx) => {
                            const minutes = zoneMinutes[idx] ?? 0;
                            const progress = Math.max(0, Math.min(1, minutes / maxZoneMin));
                            const minLabel =
                              minutes > 0 && minutes < 1 ? "<1 min" : `${Math.round(minutes)} min`;
                            return (
                              <View key={zoneNum} style={styles.cardioZoneRowWrap}>
                                <View style={styles.cardioZoneLine1}>
                                  <Text style={styles.cardioZoneLabel}>{`Zone ${zoneNum}`}</Text>
                                  <Text style={styles.cardioZoneMinutes}>{minLabel}</Text>
                                </View>
                                <View style={styles.performanceBarTrack}>
                                  <View
                                    style={[
                                      styles.performanceBarFillCardio,
                                      { width: `${progress * 100}%` },
                                    ]}
                                  />
                                </View>
                              </View>
                            );
                          })
                        )}
                      </View>
                    </View>
                  </View>
                );
              }

              return (
                <View key={session.id}>
                  <View style={styles.sectionHeaderRow}>
                    <Text
                      style={[workoutOverviewInCardHeaderStyles.title, styles.legacySessionTitle]}
                      numberOfLines={2}
                    >
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
                            : distanceLabel}
                        </Text>
                      </View>
                      <View style={styles.kpiCell}>
                        <Text style={styles.kpiLabel}>{isStrength ? "Avg Intensity" : "Avg Pace"}</Text>
                        <Text style={styles.kpiValue}>
                          {isStrength
                            ? typeof manualDaySummary?.avgIntensity === "number"
                              ? manualDaySummary.avgIntensity.toFixed(1)
                              : "—"
                            : paceLabel}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
        {!usePremiumStrengthLayout && !singleSessionPremiumCardioDay && (
          <View style={styles.exercisesSection}>
            <Text style={styles.exercisesSectionHeading}>Exercises</Text>
            {!manualDaySummary || manualDaySummary.exercises.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.placeholder}>No logged exercises</Text>
              </View>
            ) : (
              <View style={styles.exercisesList}>
              {manualDaySummary.exercises.map((exercise) => (
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
              ))}
              </View>
            )}
          </View>
        )}
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
  scrollView: { flex: 1, backgroundColor: "#F2F2F7" },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
    gap: 16,
  },
  summarySectionPlaceholder: {
    fontSize: 14,
    color: "#8E8E93",
    paddingVertical: 4,
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
  premiumWorkoutCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5EA",
  },
  strengthOverviewTitleWrap: { flex: 1, minWidth: 0, marginRight: 8 },
  strengthOverviewTime: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8E8E93",
    letterSpacing: -0.2,
    flexShrink: 0,
  },
  inCardHeaderRowSpacing: { marginBottom: 12 },
  overviewMetricsGrid: { marginTop: 16, gap: 12 },
  overviewMetricsRow: { flexDirection: "row", gap: 12 },
  overviewMetricTile: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  overviewMetricLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.78)",
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  overviewMetricValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.25,
  },
  performanceInner: { marginTop: 16, gap: 4 },
  performanceRowWrap: { marginBottom: 14, gap: 6 },
  performanceRowLine1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  performanceRowMainPress: { flex: 1, minWidth: 0, marginRight: 8 },
  performanceNameVolRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  performanceExerciseName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#1C1C1E",
    minWidth: 0,
  },
  performanceVolume: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  performanceBarTrack: {
    height: 6,
    backgroundColor: "#E5E5EA",
    borderRadius: 3,
    overflow: "hidden",
  },
  performanceBarFill: {
    height: "100%",
    backgroundColor: WORKOUT_STRENGTH_COLOR,
    borderRadius: 3,
  },
  performanceBarFillCardio: {
    height: "100%",
    backgroundColor: CARDIO_RED,
    borderRadius: 3,
  },
  cardioZonesSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    letterSpacing: 0.15,
    marginBottom: 8,
  },
  cardioZoneRowWrap: { marginBottom: 12, gap: 6 },
  cardioZoneLine1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardioZoneLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1C1C1E",
  },
  cardioZoneMinutes: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  performanceExpanded: { marginTop: 8, paddingTop: 4 },
  perfTableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
    marginBottom: 4,
  },
  perfTableHeaderCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#8E8E93",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  perfSetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F2F2F7",
  },
  perfTableCell: {
    flex: 1,
    fontSize: 14,
    color: "#1C1C1E",
    textAlign: "center",
  },
  perfColSet: { flex: 1 },
  perfColReps: { flex: 1 },
  perfColWeight: { flex: 1 },
  perfColRpe: { flex: 1 },
  perfColE1rm: { flex: 1, fontWeight: "600" },
  perfColVol: { flex: 1, fontWeight: "600" },
  workoutCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5EA",
  },
  legacySessionTitle: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sectionHeaderTime: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8E8E93",
    letterSpacing: -0.2,
    flexShrink: 0,
    marginTop: 2,
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
    marginTop: 0,
    gap: 12,
  },
  exercisesSectionHeading: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.25,
  },
  exercisesList: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 6,
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
