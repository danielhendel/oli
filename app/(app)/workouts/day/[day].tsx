import React, { useEffect, useMemo, useState } from "react";
import {
  isWorkoutDayDebugDate,
  logWorkoutDayDebug,
  logWorkoutDayDebugJournalForDay,
  workoutDayDebugEnabled,
} from "@/lib/debug/workoutDayDebug";
import { filterWorkoutHistoryItemsForDomain, type WorkoutProductDomain } from "@/lib/data/workouts/workoutDomain";
import { ScrollView, View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ScreenContainer, LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { useWorkoutDayDetail } from "@/lib/data/workouts/useWorkoutsCalendar";
import type { DayKey } from "@/lib/ui/calendar/types";
import type { DailyFactsDto } from "@/lib/contracts";
import {
  formatAvgPaceMinPerMileLabel,
  formatTypicalStrengthVolumeLabel,
  formatWorkoutDistanceLabel,
  formatWorkoutTimeLabel,
  formatWorkoutDurationLabel,
  resolveWorkoutDisplay,
  resolveWorkoutDisplayDurationMinutes,
} from "@/lib/data/workouts/workoutDisplay";
import { formatDayKeyStackNavTitle } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import { useWorkoutOverrides } from "@/lib/data/workouts/workoutOverrides";
import { reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import {
  buildWorkoutSessionSurfaceModel,
  pickJournalSummaryForStrengthSession,
  pickWorkoutForSessionActions,
  pickWorkoutOverrideForSession,
  resolveStrengthSessionExerciseDisplay,
} from "@/lib/data/workouts/workoutSessionSurface";
import { WorkoutActionSheet } from "@/lib/ui/WorkoutActionSheet";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { CARDIO_RED, WORKOUT_STRENGTH_COLOR } from "@/lib/ui/calendar/WorkoutDayRing";
import {
  WORKOUT_STRENGTH_PROGRESS_FILL,
  WORKOUT_STRENGTH_PROGRESS_TRACK_BG,
} from "@/lib/ui/workouts/workoutOverviewAnalyticsTheme";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  listManualWorkoutDaySummaries,
  totalVolumeKgForManualExercise,
  type ManualWorkoutDaySummary,
} from "@/lib/workouts/journal/manualWorkoutSummary";
import { kgToLbs } from "@/lib/metrics/metricUnits";
import { formatStrengthSetTableCells, LB_PER_KG } from "@/lib/workouts/strengthSetDisplay";
import { listMergedCustomExerciseRecords } from "@/lib/workouts/exercises/mergeCustomExerciseSources";
import { resolveStrengthLoggingType } from "@/lib/workouts/exercises/loggingType";
import { overviewAccentForTab } from "@/lib/ui/workouts/workoutOverviewAnalyticsTheme";
import { SYSTEM_ACCENT, SYSTEM_METRIC_SECONDARY } from "@/lib/ui/theme/systemAccent";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import type { HeartRateZoneMinutes5 } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { WorkoutOverride } from "@/lib/data/workouts/workoutOverrides";

/** Matches exercise-history numeric accents for set grid values. */
const METRIC_STRENGTH_ACCENT = SYSTEM_ACCENT;
const METRIC_VOLUME_ACCENT = SYSTEM_METRIC_SECONDARY;

const useLocalSearchParamsSafe: typeof useLocalSearchParams =
  typeof useLocalSearchParams === "function"
    ? useLocalSearchParams
    : ((() => ({})) as typeof useLocalSearchParams);

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

function hasMeaningfulDailyMetrics(
  dailyFacts: DailyFactsDto | null | undefined,
  domain: WorkoutProductDomain,
): boolean {
  if (!dailyFacts) return false;
  const hasActivityMetric =
    (typeof dailyFacts.activity?.steps === "number" && dailyFacts.activity.steps > 0) ||
    (typeof dailyFacts.activity?.trainingLoad === "number" && dailyFacts.activity.trainingLoad > 0);

  if (domain === "strength") {
    const s = dailyFacts.strength;
    const hasStrengthMetric =
      (typeof s?.workoutsCount === "number" && s.workoutsCount > 0) ||
      (typeof s?.totalSets === "number" && s.totalSets > 0) ||
      (typeof s?.totalReps === "number" && s.totalReps > 0);
    return hasActivityMetric || hasStrengthMetric;
  }
  return hasActivityMetric;
}

function isStrengthLikeSession(
  session: ReconciledWorkoutSession,
  overridesByWorkoutId: Record<string, WorkoutOverride | undefined>,
): boolean {
  if (session.sessionType === "strength" || session.sessionType === "mixed") return true;
  const action = pickWorkoutForSessionActions(session);
  if (!action) return false;
  const sessionOverride = pickWorkoutOverrideForSession(session, overridesByWorkoutId);
  const resolved = resolveWorkoutDisplay(
    action,
    sessionOverride ?? overridesByWorkoutId[action.id] ?? null,
  );
  return resolved.displayWorkoutType === "strength";
}

export function WorkoutDayScreen({ domain }: { domain: WorkoutProductDomain }) {
  const navigation = useNavigation();
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const params = useLocalSearchParamsSafe<{ day?: string }>();
  const dayParam = params.day ?? "";
  const isDayKey = /^\d{4}-\d{2}-\d{2}$/.test(dayParam);
  const day = (isDayKey ? dayParam : "1970-01-01") as DayKey;
  const detail = useWorkoutDayDetail(day);
  const workouts = detail.status === "ready" ? detail.workouts : [];
  const dailyFacts = detail.status === "ready" ? detail.dailyFacts : null;
  const durableTitlesByWorkoutId =
    detail.status === "ready" ? detail.durableTitlesByWorkoutId : {};
  const domainWorkouts = useMemo(
    () => filterWorkoutHistoryItemsForDomain(workouts, domain),
    [workouts, domain],
  );
  const sessions = reconcileWorkoutSessionsForDay(day, domainWorkouts);
  const sessionDebugSig = useMemo(
    () =>
      JSON.stringify(
        sessions.map((s) => ({
          id: s.id,
          t: s.sessionType,
          w: s.workouts.map((x) => x.id),
        })),
      ),
    [sessions],
  );
  const workoutIdsSig = useMemo(() => workouts.map((w) => w.id).join(","), [workouts]);
  const domainWorkoutIdsSig = useMemo(() => domainWorkouts.map((w) => w.id).join(","), [domainWorkouts]);

  useEffect(() => {
    if (!workoutDayDebugEnabled() || !isWorkoutDayDebugDate(day)) return;
    if (detail.status !== "ready") return;
    logWorkoutDayDebug("day-screen-final-sessions", {
      requestedDay: day,
      domain,
      preFilterWorkoutIds: workoutIdsSig.split(",").filter(Boolean),
      domainWorkoutIds: domainWorkoutIdsSig.split(",").filter(Boolean),
      reconciledSessions: sessions.map((s) => ({
        reconciledSessionId: s.id,
        sessionType: s.sessionType,
        title: s.title,
        titleSource: s.titleSource,
        memberRawIds: s.workouts.map((w) => w.id),
      })),
      sessionDebugSig,
    });
  }, [day, domain, detail.status, workoutIdsSig, domainWorkoutIdsSig, sessionDebugSig, sessions]);

  const workoutIds = domainWorkouts.map((w) => w.id);
  const { overridesByWorkoutId } = useWorkoutOverrides(workoutIds);
  const [menuOpen, setMenuOpen] = useState(false);
  const [manualWorkoutSummaries, setManualWorkoutSummaries] = useState<ManualWorkoutDaySummary[]>([]);
  const legacyDayExerciseSummary = useMemo(
    () => manualWorkoutSummaries.find((s) => s.day === day) ?? null,
    [manualWorkoutSummaries, day],
  );
  const [expandedPerformanceRowKey, setExpandedPerformanceRowKey] = useState<string | null>(null);
  const [customLoggingTypeByExerciseId, setCustomLoggingTypeByExerciseId] = useState<Record<string, string>>({});

  const strengthAccent = overviewAccentForTab("strength");

  const { usePremiumStrengthLayout, premiumSessionId } = useMemo(() => {
    const strengthLikes = sessions.filter((session) => isStrengthLikeSession(session, overridesByWorkoutId));
    /**
     * Single strength/mixed reconciled session → premium shell (same layout with or
     * without journal). Multiple sessions → cannot attribute exercises to one session.
     */
    const useLayout = domain === "strength" && strengthLikes.length === 1;
    return {
      usePremiumStrengthLayout: useLayout,
      premiumSessionId: useLayout ? strengthLikes[0]!.id : null,
    };
  }, [sessions, overridesByWorkoutId, domain]);

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
  const showDailyMetricsCard = hasMeaningfulDailyMetrics(dailyFacts, domain);

  const cardioAccent = overviewAccentForTab("cardio");

  const primarySession = useMemo(() => sessions[0] ?? null, [sessions]);
  const primaryWorkout = useMemo(
    () => (primarySession ? pickWorkoutForSessionActions(primarySession) : null),
    [primarySession],
  );

  const premiumStrengthSession = useMemo(
    () => (premiumSessionId != null ? sessions.find((s) => s.id === premiumSessionId) ?? null : null),
    [sessions, premiumSessionId],
  );

  const premiumJournalSummary = useMemo(() => {
    if (!premiumStrengthSession) return null;
    return pickJournalSummaryForStrengthSession(day, premiumStrengthSession, manualWorkoutSummaries);
  }, [day, premiumStrengthSession, manualWorkoutSummaries]);

  const onEditExercisesFromMenu =
    domain === "strength" &&
    usePremiumStrengthLayout &&
    Boolean(user?.uid) &&
    premiumStrengthSession != null &&
    premiumJournalSummary != null &&
    premiumJournalSummary.exercises.length > 0
      ? () => {
          setMenuOpen(false);
          const actionWorkout = pickWorkoutForSessionActions(premiumStrengthSession);
          const anchor =
            premiumStrengthSession.start ??
            actionWorkout?.start ??
            actionWorkout?.observedAt ??
            "";
          router.push({
            pathname: "/(app)/workouts/enrich",
            params: {
              enrichDay: day,
              enrichTargetId: premiumStrengthSession.id,
              journalSessionId: premiumJournalSummary.sessionId,
              ...(anchor.length > 0 ? { sessionAnchorIso: anchor } : {}),
            },
          });
        }
      : undefined;

  useEffect(() => {
    if (!isDayKey) return;
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: formatDayKeyStackNavTitle(day),
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
      setManualWorkoutSummaries([]);
      return;
    }
    void listManualWorkoutDaySummaries(user.uid, () => getIdToken(false)).then((all) => {
      if (cancelled) return;
      setManualWorkoutSummaries(all);
      logWorkoutDayDebugJournalForDay(day, all);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, day, isDayKey, getIdToken]);

  useEffect(() => {
    if (process.env.JEST_WORKER_ID) return;
    if (!user?.uid) {
      setCustomLoggingTypeByExerciseId({});
      return;
    }
    let cancelled = false;
    listMergedCustomExerciseRecords(user.uid, () => getIdToken(false))
      .then((rows) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const row of rows) next[row.exerciseId] = row.loggingType;
        setCustomLoggingTypeByExerciseId(next);
      })
      .catch(() => {
        if (!cancelled) setCustomLoggingTypeByExerciseId({});
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, getIdToken]);

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
        <LoadingState
          message={domain === "strength" ? "Loading strength workouts…" : "Loading cardio sessions…"}
        />
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
          title="No data for this day"
          description="When sessions are imported or logged for this day, they will automatically appear here."
        />
      </ScreenContainer>
    );
  }

  if (workouts.length > 0 && domainWorkouts.length === 0 && !dailyFacts) {
    return (
      <ScreenContainer backgroundColor="#F2F2F7" padded={false} edges={[...screenEdges]}>
        <EmptyState
          title={domain === "strength" ? "No strength workouts for this day" : "No cardio sessions for this day"}
          description="This day has activity in another training category. Switch products from the Dash to view it."
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
        {showDailyMetricsCard && dailyFacts && (
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
            {dailyFacts.strength && domain === "strength" && (
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
            <Text style={styles.summarySectionPlaceholder}>
              {domain === "strength"
                ? "No strength workouts from synced data for this day."
                : "No cardio sessions from synced data for this day."}
            </Text>
          ) : (
            sessions.map((session) => {
              const representative = session.workouts[0];
              if (!representative) return null;
              const journalSummary =
                domain === "strength"
                  ? pickJournalSummaryForStrengthSession(day, session, manualWorkoutSummaries)
                  : null;
              const surface = buildWorkoutSessionSurfaceModel(
                session,
                overridesByWorkoutId,
                domain,
                journalSummary,
                durableTitlesByWorkoutId,
              );
              const strengthExerciseDisplay = resolveStrengthSessionExerciseDisplay(
                journalSummary ?? null,
                surface.actionWorkout,
              );
              const sessionOverride = pickWorkoutOverrideForSession(session, overridesByWorkoutId);
              const resolvedMetrics = resolveWorkoutDisplay(
                surface.metricsWorkout,
                sessionOverride ?? overridesByWorkoutId[surface.metricsWorkout.id] ?? null,
              );
              const resolvedAction = resolveWorkoutDisplay(
                surface.actionWorkout,
                sessionOverride ?? overridesByWorkoutId[surface.actionWorkout.id] ?? null,
              );
              const timeLabel = formatWorkoutTimeLabel(
                session.start ?? surface.metricsWorkout.start ?? surface.metricsWorkout.observedAt,
              );
              const resolvedDurationMinutes = resolveWorkoutDisplayDurationMinutes({
                overrideDurationMinutes: resolvedMetrics.displayDurationMinutes,
                sessionDurationMinutes: null,
                fallbackWorkoutDurationMinutes:
                  surface.metricsWorkout.durationMinutes ?? session.durationMinutes,
              });
              const duration = formatWorkoutDurationLabel(resolvedDurationMinutes);
              const caloriesNum =
                typeof surface.metricsWorkout.calories === "number" && surface.metricsWorkout.calories >= 0
                  ? surface.metricsWorkout.calories
                  : typeof session.calories === "number"
                    ? session.calories
                    : null;
              const calories = caloriesNum != null ? `${Math.round(caloriesNum)} kcal` : "—";
              const isStrength =
                session.sessionType === "strength" ||
                session.sessionType === "mixed" ||
                resolvedAction.displayWorkoutType === "strength";
              const showPremiumStrengthBlock =
                domain === "strength" &&
                usePremiumStrengthLayout &&
                premiumSessionId === session.id &&
                isStrength;
              const showPremiumCardioBlock =
                usePremiumCardioLayout &&
                premiumCardioSessionId === session.id &&
                session.sessionType === "cardio" &&
                !isStrength;

              const titleText = surface.displayTitle;

              const distanceLabel = formatWorkoutDistanceLabel(surface.metricsWorkout.distanceMeters ?? null);
              const paceLabel = formatAvgPaceMinPerMileLabel(
                surface.metricsWorkout.distanceMeters ?? null,
                resolvedDurationMinutes,
              );

              if (showPremiumStrengthBlock) {
                const exercises = strengthExerciseDisplay.exercises;
                const sessionTrainingVolumeKg = strengthExerciseDisplay.totalVolume;
                const volumesKg = exercises.map((ex) => totalVolumeKgForManualExercise(ex));
                const maxVolKg = Math.max(1, ...volumesKg);
                const premiumTitle = titleText.trim() || "Strength workout";
                const showLogExercisesCta =
                  Boolean(user?.uid) && exercises.length === 0;

                return (
                  <View key={session.id}>
                    <View style={styles.premiumWorkoutCard} testID={`summary-card-${session.id}`}>
                      <View style={[workoutOverviewInCardHeaderStyles.row, styles.inCardHeaderRowSpacing]}>
                        <View style={styles.strengthOverviewTitleWrap}>
                          <Text style={workoutOverviewInCardHeaderStyles.title} numberOfLines={2}>
                            {premiumTitle}
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
                              {formatTypicalStrengthVolumeLabel(sessionTrainingVolumeKg)}
                            </Text>
                          </View>
                          <View
                            style={[styles.overviewMetricTile, { backgroundColor: strengthAccent.metricTileBg }]}
                          >
                            <Text style={styles.overviewMetricLabel}>Avg Intensity</Text>
                            <Text style={styles.overviewMetricValue}>
                              {typeof strengthExerciseDisplay.avgIntensity === "number"
                                ? strengthExerciseDisplay.avgIntensity.toFixed(1)
                                : "—"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.performanceInner}>
                        {exercises.length === 0 ? (
                          <View style={styles.performanceExerciseEmpty}>
                            <Text style={styles.performanceExerciseEmptyTitle}>
                              No exercises logged yet
                            </Text>
                            <Text style={styles.performanceExerciseEmptyBody}>
                              Add your lifts to match your usual logging flow. Volume and intensity
                              will appear here once you save a completed workout.
                            </Text>
                            {showLogExercisesCta ? (
                              <Pressable
                                testID="add-exercises-cta"
                                accessibilityRole="button"
                                accessibilityLabel="Add exercises for this workout"
                                onPress={() => {
                                  const anchor =
                                    session.start ??
                                    surface.actionWorkout.start ??
                                    surface.actionWorkout.observedAt ??
                                    "";
                                  router.push({
                                    pathname: "/(app)/workouts/enrich",
                                    params: {
                                      enrichDay: day,
                                      enrichTargetId: session.id,
                                      ...(journalSummary?.sessionId
                                        ? { journalSessionId: journalSummary.sessionId }
                                        : {}),
                                      ...(anchor.length > 0 ? { sessionAnchorIso: anchor } : {}),
                                    },
                                  });
                                }}
                                style={({ pressed }) => [
                                  styles.performanceExerciseEmptyCta,
                                  pressed && styles.performanceExerciseEmptyCtaPressed,
                                ]}
                              >
                                <Text style={styles.performanceExerciseEmptyCtaText}>Add exercises</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        ) : (
                          exercises.map((exercise, idx) => {
                            const rowKey = `${idx}:${exercise.name}`;
                            const loggingType = resolveStrengthLoggingType(
                              exercise.exerciseId,
                              customLoggingTypeByExerciseId[exercise.exerciseId],
                            );
                            const isLoadBased = loggingType === "weight_reps";
                            const totalReps = exercise.sets.reduce((sum, set) => sum + (set.reps ?? 0), 0);
                            const volKg = volumesKg[idx] ?? 0;
                            const volLb = Math.round(kgToLbs(volKg));
                            const volDisplay = isLoadBased
                              ? volLb >= 1
                                ? `${volLb.toLocaleString()} lb`
                                : "—"
                              : `${totalReps} reps`;
                            const progress = isLoadBased
                              ? maxVolKg > 0
                                ? Math.max(0, Math.min(1, volKg / maxVolKg))
                                : 0
                              : Math.max(0, Math.min(1, totalReps / Math.max(1, ...exercises.map((ex2) => ex2.sets.reduce((sum, set) => sum + (set.reps ?? 0), 0)))));
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
                                        params: {
                                          exerciseId: exercise.exerciseId || toExerciseIdFromName(exercise.name),
                                        },
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
                                      <Text style={styles.perfTableHeaderCell}>
                                        {isLoadBased ? "Weight" : loggingType === "bodyweight_reps" ? "Load" : "Type"}
                                      </Text>
                                      <Text style={styles.perfTableHeaderCell}>RPE</Text>
                                      <Text style={styles.perfTableHeaderCell}>{isLoadBased ? "e1RM" : "Best"}</Text>
                                      <Text style={styles.perfTableHeaderCell}>{isLoadBased ? "Vol" : "Session"}</Text>
                                    </View>
                                    {exercise.sets.map((set) => {
                                      const cells = formatStrengthSetTableCells({
                                        setNumber: set.setNumber,
                                        reps: set.reps,
                                        weightKg: set.weightKg,
                                        intensity: set.intensity,
                                        ...(set.isWarmup === true ? { isWarmup: true as const } : {}),
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
                                            {isLoadBased
                                              ? cells.weightLabel
                                              : loggingType === "bodyweight_reps"
                                                ? set.weightKg != null && set.weightKg > 0
                                                  ? `BW + ${(set.weightKg * LB_PER_KG).toFixed(1)} lb`
                                                  : "BW"
                                                : "Reps"}
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
                                            {isLoadBased ? cells.e1RmLbLabel : String(set.reps ?? "—")}
                                          </Text>
                                          <Text
                                            style={[
                                              styles.perfTableCell,
                                              styles.perfColVol,
                                              { color: METRIC_VOLUME_ACCENT },
                                            ]}
                                          >
                                            {isLoadBased ? cells.volLbLabel : "—"}
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
                      {titleText}
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
                            ? formatTypicalStrengthVolumeLabel(strengthExerciseDisplay.totalVolume)
                            : distanceLabel}
                        </Text>
                      </View>
                      <View style={styles.kpiCell}>
                        <Text style={styles.kpiLabel}>{isStrength ? "Avg Intensity" : "Avg Pace"}</Text>
                        <Text style={styles.kpiValue}>
                          {isStrength
                            ? typeof strengthExerciseDisplay.avgIntensity === "number"
                              ? strengthExerciseDisplay.avgIntensity.toFixed(1)
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
            {!legacyDayExerciseSummary || legacyDayExerciseSummary.exercises.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.placeholder}>No logged exercises</Text>
              </View>
            ) : (
              <View style={styles.exercisesList}>
              {legacyDayExerciseSummary.exercises.map((exercise) => (
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
          router.push({
            pathname: domain === "strength" ? "/(app)/workouts/day/[day]" : "/(app)/cardio/day/[day]",
            params: { day },
          });
        }}
        onDoItAgain={() => {
          setMenuOpen(false);
          router.push(domain === "strength" ? "/(app)/workouts/log" : "/(app)/cardio/log");
        }}
        {...(onEditExercisesFromMenu != null ? { onEditExercises: onEditExercisesFromMenu } : {})}
        onRename={() => {
          if (!primaryWorkout || !primarySession) return;
          const journalSummary =
            domain === "strength"
              ? pickJournalSummaryForStrengthSession(day, primarySession, manualWorkoutSummaries)
              : null;
          const surface = buildWorkoutSessionSurfaceModel(
            primarySession,
            overridesByWorkoutId,
            domain,
            journalSummary,
            durableTitlesByWorkoutId,
          );
          setMenuOpen(false);
          router.push({
            pathname: "/(app)/workouts/edit/rename",
            params: {
              workoutId: primaryWorkout.id,
              currentTitle: surface.displayTitle,
              titleAnchorObservedAt: primaryWorkout.start ?? primaryWorkout.observedAt,
            },
          });
        }}
        onEditDuration={() => {
          if (!primaryWorkout || !primarySession) return;
          const sessionOverride = pickWorkoutOverrideForSession(primarySession, overridesByWorkoutId);
          const resolved = resolveWorkoutDisplay(
            primaryWorkout,
            sessionOverride ?? overridesByWorkoutId[primaryWorkout.id] ?? null,
          );
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
          if (!primaryWorkout || !primarySession) return;
          const sessionOverride = pickWorkoutOverrideForSession(primarySession, overridesByWorkoutId);
          const resolved = resolveWorkoutDisplay(
            primaryWorkout,
            sessionOverride ?? overridesByWorkoutId[primaryWorkout.id] ?? null,
          );
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

export default function WorkoutDayStrengthRoute() {
  return <WorkoutDayScreen domain="strength" />;
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
  performanceExerciseEmpty: {
    marginTop: 4,
    paddingVertical: 20,
    paddingHorizontal: 4,
    alignItems: "center",
    gap: 10,
  },
  performanceExerciseEmptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.25,
    textAlign: "center",
  },
  performanceExerciseEmptyBody: {
    fontSize: 15,
    lineHeight: 21,
    color: "#8E8E93",
    textAlign: "center",
    maxWidth: 320,
  },
  performanceExerciseEmptyCta: {
    marginTop: 6,
    backgroundColor: WORKOUT_STRENGTH_COLOR,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 200,
    alignItems: "center",
  },
  performanceExerciseEmptyCtaPressed: {
    opacity: 0.88,
  },
  performanceExerciseEmptyCtaText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.25,
  },
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
    backgroundColor: WORKOUT_STRENGTH_PROGRESS_TRACK_BG,
    borderRadius: 999,
    overflow: "hidden",
  },
  performanceBarFill: {
    height: "100%",
    backgroundColor: WORKOUT_STRENGTH_PROGRESS_FILL,
    borderRadius: 999,
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
    color: SYSTEM_ACCENT,
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
    color: SYSTEM_ACCENT,
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
