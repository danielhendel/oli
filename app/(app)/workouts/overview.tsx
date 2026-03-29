/**
 * Workouts Overview — W1 Apple Health integration.
 * Connection status, today metrics (steps, active minutes, active energy, resting HR),
 * recent workouts, last sync, manual "Sync now". Fail-closed: requestId on all API failures.
 *
 * INGESTION: Steps and workouts only (existing kinds). Resting HR, active energy, exercise time:
 * contract kind="incomplete" allows only payload.note (no structured fields); we show them in UI only and do NOT ingest.
 */

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  NativeModules,
  AppState,
  InteractionManager,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/lib/auth/AuthProvider";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { getGymMenuOptions } from "@/lib/workouts/gymRegistry";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { LoadingState, EmptyState } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HeaderIconButton } from "@/lib/ui/HeaderIconButton";
import { WorkoutsHeaderRightRow } from "@/lib/ui/headers/WorkoutsHeaderRightRow";
import {
  WORKOUTS_SCREEN_CONTENT_BG,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";
import { WeeklyStrip } from "@/lib/ui/calendar/WeeklyStrip";
import { addCalendarDaysToDayKey, getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { CalendarDay, WorkoutDayMarker } from "@/lib/ui/calendar/types";
import {
  DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
  useWorkoutsCalendarRange,
} from "@/lib/data/workouts/useWorkoutsCalendar";
import {
  filterWorkoutCalendarDaysInclusive,
  overviewSharedRangeBounds,
  overviewStrengthMainTabCalendarBounds,
} from "@/lib/data/workouts/overviewCalendarRangeSlices";
import {
  buildWorkoutOverviewAnalyticsFromCalendarDays,
  getRecentWorkoutSessionsFromCalendarDays,
  WORKOUT_OVERVIEW_ANALYTICS_RANGE_END,
  WORKOUT_OVERVIEW_ANALYTICS_RANGE_START,
  WORKOUT_OVERVIEW_ANALYTICS_YEAR,
} from "@/lib/data/workouts/workoutsCalendarModel";
import type { WorkoutProductDomain } from "@/lib/data/workouts/workoutDomain";
import { mapWorkoutCalendarDaysForDomain } from "@/lib/data/workouts/workoutDomain";
import {
  pullTodaySnapshot,
  pullAnchoredWorkouts,
  pullWorkoutsByDateRange,
  toHealthKitIso8601,
  stepsIdempotencyKey,
  workoutIdempotencyKey,
  type TodaySnapshot,
} from "@/lib/integrations/appleHealth";
import {
  shouldRequestHistoricalBootstrapRange,
  WORKOUT_RANGE_BOOTSTRAP_BUILD_ID,
} from "@/lib/integrations/appleHealth/workoutBootstrapPolicy";
import { clearWorkoutsAnchor, getWorkoutsAnchor, setWorkoutsAnchor } from "@/lib/integrations/appleHealth/anchor";
import {
  runWorkoutHistoryBackfillPasses,
  DEFAULT_WORKOUT_BACKFILL_MAX_PASSES,
} from "@/lib/integrations/appleHealth/runWorkoutHistoryBackfill";
import {
  getLastSyncAt,
  setLastSyncAt,
  getAppleHealthLastCheckedAt,
  setAppleHealthLastCheckedAt,
  getAppleHealthConnected,
  getAppleHealthNotAvailable,
  getAppleHealthDeepBackfillVersion,
  setAppleHealthDeepBackfillVersion,
  setAppleHealthNotAvailable,
  getAppleHealthWorkoutRangeBootstrapBuild,
  setAppleHealthWorkoutRangeBootstrapBuild,
  clearAppleHealthWorkoutRangeBootstrapBuild,
} from "@/lib/integrations/appleHealth/storage";
import { ingestRawEvent } from "@/lib/api/ingest";
import { shouldRun, nowIso } from "@/lib/sync/throttle";
import {
  formatWorkoutDurationLabel,
  resolveWorkoutDisplay,
  resolveWorkoutDisplayDurationMinutes,
} from "@/lib/data/workouts/workoutDisplay";
import { deriveSessionTypeFlags, reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import { useWorkoutOverrides } from "@/lib/data/workouts/workoutOverrides";
import { WorkoutActionSheet } from "@/lib/ui/WorkoutActionSheet";
import type { WorkoutActionAnchor } from "@/lib/ui/WorkoutActionSheet";
import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import {
  listManualWorkoutDaySummaries,
  type ManualWorkoutDaySummary,
} from "@/lib/workouts/journal/manualWorkoutSummary";
import {
  listCustomExercises,
  type CustomExerciseRecord,
} from "@/lib/workouts/exercises/customExerciseStore";
import { buildWeeklyStrengthCardModel } from "@/lib/data/workouts/weeklyStrengthCardModel";
import { buildWeeklyInsightsCardModel } from "@/lib/data/workouts/weeklyInsightsCardModel";
import { WorkoutAnalyticsChart } from "@/lib/ui/workouts/WorkoutAnalyticsChart";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { WorkoutsOverviewBottomNav } from "@/lib/ui/workouts/WorkoutsOverviewBottomNav";
import { buildTodayOverviewModel } from "@/lib/data/workouts/todayOverviewModel";
import { TodayCard } from "@/lib/ui/workouts/TodayCard";
import { WeeklyInsightsCard } from "@/lib/ui/workouts/WeeklyInsightsCard";
import { serializeStrengthAnalyticsFocusParams } from "@/lib/workouts/navigation/strengthAnalyticsNavigationIntent";

type ConnectionStatus = "loading" | "not_available" | "not_connected" | "connected";

type MaybeIsAvailable = { isAvailable?: unknown };
function getIsAvailableFn(v: unknown): ((cb: (err: unknown, available: boolean) => void) => void) | null {
  if (v == null) return null;
  const cand = (v as MaybeIsAvailable).isAvailable;
  return typeof cand === "function"
    ? (cand as (cb: (err: unknown, available: boolean) => void) => void)
    : null;
}

const ANCHOR_LIMIT = 500;
const APPLE_AUTO_MIN_MS = 2 * 60_000;
const WORKOUT_DEEP_BACKFILL_VERSION = "v13m";
const WORKOUT_DEEP_BACKFILL_IN_PROGRESS = "v13m:in_progress";
const CARD_BG = "#FFFFFF";
const RADIUS = 12;

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function runAfterInteractionsSafe(task: () => void): { cancel: () => void } {
  const run = InteractionManager?.runAfterInteractions;
  if (typeof run === "function") {
    return run(task);
  }
  task();
  return { cancel: () => void 0 };
}

function shellTitleForDomain(domain: WorkoutProductDomain): string {
  return domain === "strength" ? "Strength" : "Cardio";
}

function shellSubtitleForDomain(domain: WorkoutProductDomain): string {
  return domain === "strength" ? "Training & lifting" : "Runs, rides, and more";
}

function basePathForDomain(domain: WorkoutProductDomain): "/(app)/workouts" | "/(app)/cardio" {
  return domain === "strength" ? "/(app)/workouts" : "/(app)/cardio";
}

function formatWorkoutDayLabel(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  const wd = WEEKDAY_SHORT[d.getUTCDay()] ?? "";
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${wd} ${month}/${day}`;
}

function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

function getTodayBounds(): { start: string; end: string; day: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const start = new Date(y, m, d, 0, 0, 0, 0);
  const end = new Date(y, m, d, 23, 59, 59, 999);
  const day = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { start: start.toISOString(), end: end.toISOString(), day };
}

function getHistoricalBootstrapRange(monthsBack = 12): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - monthsBack);
  return { startDate: toHealthKitIso8601(start), endDate: toHealthKitIso8601(end) };
}

function OverflowMenuButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.headerMenuBtn}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.headerMenuText}>•••</Text>
    </Pressable>
  );
}

export function TrainingOverviewScreen({ domain }: { domain: WorkoutProductDomain }) {
  const navigation = useNavigation();
  const router = useRouter();
  const basePath = basePathForDomain(domain);
  const shellTitle = shellTitleForDomain(domain);
  const shellSubtitle = shellSubtitleForDomain(domain);
  const { user, initializing, getIdToken } = useAuth();
  const { state: prefState, setSelectedGymId } = usePreferences();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("loading");
  const [snapshot, setSnapshot] = useState<TodaySnapshot | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [workoutMenuOpen, setWorkoutMenuOpen] = useState(false);
  const [selectedWorkoutForMenu, setSelectedWorkoutForMenu] = useState<{
    day: string;
    session: ReconciledWorkoutSession;
  } | null>(null);
  const [workoutMenuAnchor, setWorkoutMenuAnchor] = useState<WorkoutActionAnchor | null>(null);
  const [manualWorkoutSummaries, setManualWorkoutSummaries] = useState<ManualWorkoutDaySummary[]>([]);
  const [customExerciseById, setCustomExerciseById] = useState<ReadonlyMap<string, CustomExerciseRecord>>(
    () => new Map(),
  );
  const today = getTodayDayKeyLocal();
  const anchorDay = today;
  const [workoutsCalendarRefreshEpoch, setWorkoutsCalendarRefreshEpoch] = useState(0);
  const workoutBackfillInFlightRef = useRef(false);
  const pendingPostBootstrapCoverageLogRef = useRef(false);

  const weekDaysFull = getWeekDaysForAnchor(anchorDay);
  const weekStart = weekDaysFull[0]!;
  const weekEnd = weekDaysFull[weekDaysFull.length - 1]!;
  const prevWeekStart = useMemo(() => addCalendarDaysToDayKey(weekStart, -7), [weekStart]);
  const prevWeekEnd = useMemo(() => addCalendarDaysToDayKey(weekEnd, -7), [weekEnd]);
  const recentRangeStart = addCalendarDaysToDayKey(today, -120);
  const recentRangeEnd = today;
  const analyticsRangeStart = WORKOUT_OVERVIEW_ANALYTICS_RANGE_START;
  const analyticsRangeEnd = WORKOUT_OVERVIEW_ANALYTICS_RANGE_END;
  const { start: overviewRangeStart, end: overviewRangeEnd } = useMemo(
    () =>
      domain === "strength"
        ? overviewStrengthMainTabCalendarBounds({
            weekStart,
            weekEnd,
            recentStart: recentRangeStart,
            recentEnd: recentRangeEnd,
          })
        : overviewSharedRangeBounds({
            weekStart,
            weekEnd,
            recentStart: recentRangeStart,
            recentEnd: recentRangeEnd,
            analyticsStart: analyticsRangeStart,
            analyticsEnd: analyticsRangeEnd,
          }),
    [
      domain,
      weekStart,
      weekEnd,
      recentRangeStart,
      recentRangeEnd,
      analyticsRangeStart,
      analyticsRangeEnd,
    ],
  );

  const calendarRangeOptionsShared = useMemo(
    () => ({
      refreshEpoch: workoutsCalendarRefreshEpoch,
      rawEventKinds: DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
      debugHydrateLabel: "overview-shared" as const,
    }),
    [workoutsCalendarRefreshEpoch],
  );

  const overviewSharedRange = useWorkoutsCalendarRange(
    overviewRangeStart,
    overviewRangeEnd,
    calendarRangeOptionsShared,
  );

  const sharedDays = overviewSharedRange.status === "ready" ? overviewSharedRange.days : [];

  const domainSharedDays = useMemo(
    () => mapWorkoutCalendarDaysForDomain(sharedDays, domain),
    [sharedDays, domain],
  );

  const weekDaysSlice = useMemo(
    () => filterWorkoutCalendarDaysInclusive(domainSharedDays, weekStart, weekEnd),
    [domainSharedDays, weekStart, weekEnd],
  );
  const recentDaysSlice = useMemo(
    () => filterWorkoutCalendarDaysInclusive(domainSharedDays, recentRangeStart, recentRangeEnd),
    [domainSharedDays, recentRangeStart, recentRangeEnd],
  );
  const analyticsDaysSlice = useMemo(
    () => filterWorkoutCalendarDaysInclusive(domainSharedDays, analyticsRangeStart, analyticsRangeEnd),
    [domainSharedDays, analyticsRangeStart, analyticsRangeEnd],
  );

  const overviewPerfRef = useRef<{ t0: number } | null>(null);

  useEffect(() => {
    if (!__DEV__ || process.env.JEST_WORKER_ID) return;
    if (!user?.uid) return;
    overviewPerfRef.current = { t0: performance.now() };
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_PERF] overview-shared-range-start", {
      overviewRangeStart,
      overviewRangeEnd,
      refreshEpoch: workoutsCalendarRefreshEpoch,
    });
  }, [user?.uid, overviewRangeStart, overviewRangeEnd, workoutsCalendarRefreshEpoch]);

  useEffect(() => {
    if (!__DEV__ || process.env.JEST_WORKER_ID) return;
    const range = overviewSharedRange;
    if (range.status !== "ready") return;
    const t0 = overviewPerfRef.current?.t0;
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_PERF] overview-shared-range-ready", {
      ms: typeof t0 === "number" ? performance.now() - t0 : null,
      totalDaysInSharedRange: range.days.length,
      refreshing: Boolean(range.refreshing),
    });
  }, [overviewSharedRange]);

  useEffect(() => {
    if (!__DEV__ || process.env.JEST_WORKER_ID) return;
    if (overviewSharedRange.status !== "ready") return;
    const t0 = overviewPerfRef.current?.t0;
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_PERF] overview-derived-slices-ready", {
      ms: typeof t0 === "number" ? performance.now() - t0 : null,
      weekSliceDays: weekDaysSlice.length,
      recentSliceDays: recentDaysSlice.length,
      analyticsSliceDays: analyticsDaysSlice.length,
    });
  }, [overviewSharedRange.status, weekDaysSlice, recentDaysSlice, analyticsDaysSlice]);

  const weeklyStripDays: CalendarDay<WorkoutDayMarker>[] = useMemo(
    () =>
      overviewSharedRange.status === "ready"
        ? weekDaysSlice.map((d) => {
            const markerFlags = deriveSessionTypeFlags(reconcileWorkoutSessionsForDay(d.day, d.workouts));
            return {
              day: d.day,
              meta: {
                hasWorkouts: d.workouts.length > 0,
                hasStrength: markerFlags.hasStrength,
                hasCardio: markerFlags.hasCardio,
                workoutCount: d.workouts.length,
                workouts: d.workouts,
              },
            };
          })
        : weekDaysFull.map((day) => ({
            day,
            meta: {
              hasWorkouts: false,
              hasStrength: false,
              hasCardio: false,
              workoutCount: 0,
              workouts: [],
            },
          })),
    [overviewSharedRange.status, weekDaysSlice, weekDaysFull],
  );

  const recentWorkouts = useMemo(() => {
    if (overviewSharedRange.status !== "ready") return [];
    return getRecentWorkoutSessionsFromCalendarDays(recentDaysSlice, 7);
  }, [overviewSharedRange.status, recentDaysSlice]);

  const weekWorkoutIds = useMemo(
    () =>
      weekDaysSlice.flatMap((d) =>
        reconcileWorkoutSessionsForDay(d.day, d.workouts).flatMap((s) => s.workouts.map((w) => w.id)),
      ),
    [weekDaysSlice],
  );

  const recentWorkoutIds = useMemo(
    () => recentWorkouts.map((entry) => entry.session.workouts[0]?.id ?? entry.session.id),
    [recentWorkouts],
  );

  const workoutIdsForOverrides = useMemo(() => {
    const uniq = new Set<string>();
    for (const id of recentWorkoutIds) uniq.add(id);
    for (const id of weekWorkoutIds) uniq.add(id);
    return [...uniq];
  }, [recentWorkoutIds, weekWorkoutIds]);

  const { overridesByWorkoutId, reload } = useWorkoutOverrides(workoutIdsForOverrides);

  /** Strength main tab does not render the yearly chart; skip scanning the analytics year slice. */
  const strengthPlaceholderOverviewAnalytics = useMemo(() => {
    const bundle = buildWorkoutOverviewAnalyticsFromCalendarDays([], { todayDayKey: today });
    return {
      chartPoints: bundle.chartPointsByTab.strength,
      metrics: bundle.metricsByTab.strength,
    };
  }, [today]);

  const cardioOverviewAnalyticsFromCalendar = useMemo(() => {
    const bundle =
      overviewSharedRange.status === "ready"
        ? buildWorkoutOverviewAnalyticsFromCalendarDays(analyticsDaysSlice, { todayDayKey: today })
        : buildWorkoutOverviewAnalyticsFromCalendarDays([], { todayDayKey: today });
    return {
      chartPoints: bundle.chartPointsByTab.cardio,
      metrics: bundle.metricsByTab.cardio,
    };
  }, [overviewSharedRange.status, analyticsDaysSlice, today]);

  const rawOverviewAnalyticsSingle =
    domain === "strength" ? strengthPlaceholderOverviewAnalytics : cardioOverviewAnalyticsFromCalendar;

  const manualWorkoutNameByDay = useMemo(() => {
    const next: Record<string, string> = {};
    for (const row of manualWorkoutSummaries) {
      if (row.customName?.trim()) next[row.day] = row.customName.trim();
    }
    return next;
  }, [manualWorkoutSummaries]);

  const weeklyInsightsCardModel = useMemo(() => {
    if (domain !== "strength") return null;
    const analyticsCtx = { customExerciseById };
    const currentWeek = buildWeeklyStrengthCardModel(manualWorkoutSummaries, {
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
      weekKey: `${weekStart}..${weekEnd}`,
      sessionDisplayHints: [],
      analyticsContext: analyticsCtx,
    });
    const previousWeek = buildWeeklyStrengthCardModel(manualWorkoutSummaries, {
      weekStartDay: prevWeekStart,
      weekEndDay: prevWeekEnd,
      weekKey: `${prevWeekStart}..${prevWeekEnd}`,
      sessionDisplayHints: [],
      analyticsContext: analyticsCtx,
    });
    return buildWeeklyInsightsCardModel(currentWeek, previousWeek);
  }, [domain, manualWorkoutSummaries, weekStart, weekEnd, prevWeekStart, prevWeekEnd, customExerciseById]);

  const overviewAnalytics = rawOverviewAnalyticsSingle;
  const todayModel = useMemo(() => buildTodayOverviewModel(snapshot), [snapshot]);
  useEffect(() => {
    if (!__DEV__ || process.env.JEST_WORKER_ID) return;
    if (overviewSharedRange.status !== "ready") return;
    const sessions = analyticsDaysSlice.flatMap((d) => reconcileWorkoutSessionsForDay(d.day, d.workouts));
    const rawCount = analyticsDaysSlice.reduce((acc, d) => acc + d.workouts.length, 0);
    const nonEmpty = analyticsDaysSlice.filter((d) => d.workouts.length > 0).map((d) => d.day);
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_TRUTH_DEBUG] analytics-source", {
      productDomain: domain,
      rawEventKinds: [...DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS],
      analyticsRangeStart,
      analyticsRangeEnd,
      earliestSessionDay: sessions[0]?.day ?? null,
      latestSessionDay: sessions[sessions.length - 1]?.day ?? null,
      rawWorkoutItems: rawCount,
      totalSessions: sessions.length,
      overviewDomainTotal: overviewAnalytics.metrics.totalWorkouts,
      markedDays: nonEmpty,
    });
  }, [overviewSharedRange.status, analyticsDaysSlice, overviewAnalytics, analyticsRangeStart, analyticsRangeEnd, domain]);

  useEffect(() => {
    if (!__DEV__ || process.env.JEST_WORKER_ID) return;
    if (!pendingPostBootstrapCoverageLogRef.current) return;
    if (overviewSharedRange.status !== "ready") return;
    pendingPostBootstrapCoverageLogRef.current = false;
    const nonEmpty = analyticsDaysSlice.filter((d) => d.workouts.length > 0);
    const totalRaw = nonEmpty.reduce((acc, d) => acc + d.workouts.length, 0);
    const totalSessions = nonEmpty.reduce(
      (acc, d) => acc + reconcileWorkoutSessionsForDay(d.day, d.workouts).length,
      0,
    );
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_BOOTSTRAP_DEBUG] post-refresh-model-coverage", {
      modelWindowStart: analyticsRangeStart,
      modelWindowEnd: analyticsRangeEnd,
      earliestStoredWorkoutDay: nonEmpty[0]?.day ?? null,
      latestStoredWorkoutDay: nonEmpty[nonEmpty.length - 1]?.day ?? null,
      daysWithWorkouts: nonEmpty.length,
      totalRawWorkoutItems: totalRaw,
      totalReconciledSessions: totalSessions,
    });
  }, [overviewSharedRange.status, analyticsDaysSlice, analyticsRangeStart, analyticsRangeEnd]);

  useEffect(() => {
    let cancelled = false;
    if (process.env.JEST_WORKER_ID) return;
    if (domain !== "strength") {
      setManualWorkoutSummaries([]);
      setCustomExerciseById(new Map());
      return;
    }
    if (overviewSharedRange.status !== "ready") return;
    if (!user?.uid) {
      setManualWorkoutSummaries([]);
      setCustomExerciseById(new Map());
      return;
    }
    const task = runAfterInteractionsSafe(() => {
      void Promise.all([listManualWorkoutDaySummaries(user.uid), listCustomExercises(user.uid)]).then(
        ([rows, customRows]) => {
          if (cancelled) return;
          setManualWorkoutSummaries(rows);
          setCustomExerciseById(new Map(customRows.map((r) => [r.exerciseId, r])));
        },
      );
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [domain, overviewSharedRange.status, user?.uid]);

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      headerRight: () => (
        <WorkoutsHeaderRightRow>
          <HeaderIconButton
            iconName="calendar-outline"
            iconSize={24}
            color="#FF3B30"
            accessibilityLabel={`Open ${shellTitle.toLowerCase()} calendar`}
            onPress={() =>
              router.push(domain === "strength" ? "/(app)/workouts/calendar" : "/(app)/cardio/calendar")
            }
          />
          {domain === "strength" ? (
            <OverflowMenuButton
              onPress={() => setMenuOpen(true)}
              label="Strength training menu"
            />
          ) : null}
        </WorkoutsHeaderRightRow>
      ),
      title: shellTitle,
    });
  }, [navigation, router, setMenuOpen, domain, shellTitle]);

  const loadStored = useCallback(async (skipNotAvailableCheck?: boolean) => {
    const [sync, checked, connected, notAvailable] = await Promise.all([
      getLastSyncAt(),
      getAppleHealthLastCheckedAt(),
      getAppleHealthConnected(),
      getAppleHealthNotAvailable(),
    ]);
    void sync;
    void checked;
    if (!skipNotAvailableCheck && notAvailable) {
      console.log("[AH] status set Not available", { platform: Platform.OS });
      setConnectionStatus("not_available");
      return;
    }
    if (connected) {
      setConnectionStatus("connected");
      return;
    }
    setConnectionStatus("not_connected");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (Platform.OS !== "ios") {
        const mod = await import("react-native-health")
          .then((m) => m.default)
          .catch(() => null);
        if (cancelled) return;
        if (!mod || typeof mod.isAvailable !== "function") {
          console.log("[AH] status set Not available", { platform: Platform.OS });
          await setAppleHealthNotAvailable(true);
          setConnectionStatus("not_available");
          return;
        }
        mod.isAvailable((err: unknown, available: boolean) => {
          if (cancelled) return;
          if (err || !available) {
            console.log("[AH] status set Not available", { platform: Platform.OS });
            setAppleHealthNotAvailable(true).then(() => setConnectionStatus("not_available"));
            return;
          }
          loadStored();
        });
        return;
      }

      // iOS: always run checkAvailability(); do not use stored notAvailable to force Not available
      console.log("[AH] checkAvailability start");
      const nm = NativeModules as Record<string, unknown>;
      const candidate = nm["AppleHealthKit"] ?? null;
      const isAvail = getIsAvailableFn(candidate);
      if (!candidate || !isAvail) {
        setConnectionStatus("not_available");
        return;
      }
      isAvail((err: unknown, available: boolean) => {
        if (cancelled) return;
        if (err || !available) {
          setConnectionStatus("not_available");
          return;
        }
        loadStored(true);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStored]);

  const refetchSnapshot = useCallback(async () => {
    const result = await pullTodaySnapshot();
    if (result.ok) setSnapshot(result.data);
    else setSnapshot(null);
  }, []);

  useEffect(() => {
    if (connectionStatus === "connected") refetchSnapshot();
  }, [connectionStatus, refetchSnapshot]);

  const maybeAutoAppleSync = useCallback(
    async (reason: "focus" | "foreground") => {
      void reason; // reserved for future idempotency / logging
      if (connectionStatus !== "connected" || !user) return;
      const token = await getIdToken(false);
      if (!token) return;

      const deepBackfillVersion = await getAppleHealthDeepBackfillVersion().catch(() => null);
      const needsDeepBackfill =
        deepBackfillVersion !== WORKOUT_DEEP_BACKFILL_VERSION;
      let rangeBootstrapBuildId = await getAppleHealthWorkoutRangeBootstrapBuild().catch(() => null);
      const last = await getAppleHealthLastCheckedAt().catch(() => null);
      if (!needsDeepBackfill && !shouldRun(last, APPLE_AUTO_MIN_MS)) return;
      if (workoutBackfillInFlightRef.current) return;
      workoutBackfillInFlightRef.current = true;
      try {
        let didBootstrapReset = false;
        if (needsDeepBackfill && deepBackfillVersion !== WORKOUT_DEEP_BACKFILL_IN_PROGRESS) {
          try {
            await clearWorkoutsAnchor(user.uid);
          } catch {
            // ignore anchor reset failures and continue fail-closed via normal sync results
          }
          try {
            await clearAppleHealthWorkoutRangeBootstrapBuild();
          } catch {
            // best-effort: allow range bootstrap to run again with deep heal
          }
          rangeBootstrapBuildId = null;
          try {
            await setAppleHealthDeepBackfillVersion(WORKOUT_DEEP_BACKFILL_IN_PROGRESS);
          } catch {
            // ignore marker persistence failures; next run can retry bootstrap
          }
          didBootstrapReset = true;
        }
        const shouldBootstrapRange = shouldRequestHistoricalBootstrapRange({
          platformOs: Platform.OS,
          needsDeepBackfill,
          storedRangeBootstrapBuildId: rangeBootstrapBuildId,
        });
        if (__DEV__ && !process.env.JEST_WORKER_ID) {
          // eslint-disable-next-line no-console
          console.log("[WORKOUT_TRUTH_DEBUG] backfill-start", {
            reason,
            deepBackfillVersion,
            needsDeepBackfill,
            didBootstrapReset,
          });
          // eslint-disable-next-line no-console
          console.log("[WORKOUT_BOOTSTRAP_DEBUG] sync-plan", {
            platform: Platform.OS,
            shouldBootstrapRange,
            needsDeepBackfill,
            storedRangeBootstrapBuildId: rangeBootstrapBuildId,
            expectedRangeBootstrapBuildId: WORKOUT_RANGE_BOOTSTRAP_BUILD_ID,
          });
        }
        const result = await runWorkoutHistoryBackfillPasses(
          {
            uid: user.uid,
            token,
            limit: ANCHOR_LIMIT,
            maxPasses: DEFAULT_WORKOUT_BACKFILL_MAX_PASSES,
            ...(shouldBootstrapRange ? { bootstrapRange: getHistoricalBootstrapRange(12) } : {}),
          },
          {
            getWorkoutsAnchor,
            setWorkoutsAnchor,
            pullAnchoredWorkouts,
            pullWorkoutsByDateRange,
            pullTodaySnapshot,
            ingestRawEvent,
            getTodayBounds,
            getDeviceTimezone,
            stepsIdempotencyKey,
            workoutIdempotencyKey,
          },
        );

        if (!result.ok) {
          return;
        }
        if (__DEV__ && !process.env.JEST_WORKER_ID) {
          // eslint-disable-next-line no-console
          console.log("[WORKOUT_TRUTH_DEBUG] backfill-stop", {
            reason,
            passesRun: result.passesRun,
            mayHaveMoreWorkouts: result.mayHaveMoreWorkouts,
            stopReason: result.mayHaveMoreWorkouts ? "budget_reached" : "history_exhausted",
            bootstrap: result.bootstrap,
          });
        }
        if (!result.mayHaveMoreWorkouts) {
          try {
            await setAppleHealthDeepBackfillVersion(WORKOUT_DEEP_BACKFILL_VERSION);
          } catch {
            // best effort marker write; data path remains correct regardless
          }
        }

        if (result.bootstrap.attempted) {
          try {
            await setAppleHealthWorkoutRangeBootstrapBuild(WORKOUT_RANGE_BOOTSTRAP_BUILD_ID);
          } catch {
            // best effort; next launch can retry range bootstrap if build id missing
          }
          if (__DEV__ && !process.env.JEST_WORKER_ID) {
            pendingPostBootstrapCoverageLogRef.current = true;
          }
        }

        const atIso = nowIso();
        await setAppleHealthLastCheckedAt(atIso);
        await setLastSyncAt(atIso);
        await refetchSnapshot();
        setWorkoutsCalendarRefreshEpoch((n) => n + 1);
      } finally {
        workoutBackfillInFlightRef.current = false;
      }
    },
    [
      connectionStatus,
      user,
      getIdToken,
      refetchSnapshot,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      void maybeAutoAppleSync("focus");
      void reload();
    }, [maybeAutoAppleSync, reload]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void maybeAutoAppleSync("foreground");
    });
    return () => sub.remove();
  }, [maybeAutoAppleSync]);

  const closeWorkoutMenu = useCallback(() => {
    setWorkoutMenuOpen(false);
    setSelectedWorkoutForMenu(null);
    setWorkoutMenuAnchor(null);
  }, []);

  const openEditRoute = useCallback(
    (mode: "rename" | "duration" | "type") => {
      if (!selectedWorkoutForMenu) return;
      const workout = selectedWorkoutForMenu.session.workouts[0];
      if (!workout) return;
      const override = overridesByWorkoutId[workout.id];
      const resolved = resolveWorkoutDisplay(workout, override ?? null);
      closeWorkoutMenu();
      router.push({
        pathname: `/(app)/workouts/edit/${mode}`,
        params: {
          workoutId: workout.id,
          currentTitle: resolved.displayTitle,
          currentDurationMinutes:
            typeof resolved.displayDurationMinutes === "number"
              ? String(Math.round(resolved.displayDurationMinutes))
              : "",
          currentWorkoutType: resolved.displayWorkoutType,
        },
      });
    },
    [selectedWorkoutForMenu, overridesByWorkoutId, closeWorkoutMenu, router],
  );

  const recentCard = (
    <View style={styles.card}>
      <View style={workoutOverviewInCardHeaderStyles.row}>
        <Text style={workoutOverviewInCardHeaderStyles.title}>
          {domain === "strength" ? "Recent" : "Recent cardio sessions"}
        </Text>
        <Pressable
          onPress={() => router.push(`${basePath}/recent-workouts-full`)}
          accessibilityRole="button"
          accessibilityLabel="View more"
          hitSlop={8}
          style={({ pressed }) => [
            workoutOverviewInCardHeaderStyles.linkHit,
            pressed && workoutOverviewInCardHeaderStyles.linkPressed,
          ]}
        >
          <Text style={workoutOverviewInCardHeaderStyles.link}>View More</Text>
        </Pressable>
      </View>
      {recentWorkouts.length === 0 ? (
        <Text style={styles.placeholder}>
          {domain === "strength" ? "No strength workouts yet" : "No cardio sessions yet"}
        </Text>
      ) : (
        recentWorkouts.map(({ day, session }) => {
          const representative = session.workouts[0];
          if (!representative) return null;
          const override = overridesByWorkoutId[representative.id];
          const resolved = resolveWorkoutDisplay(representative, override ?? null);
          const durationLabel = formatWorkoutDurationLabel(
            resolveWorkoutDisplayDurationMinutes({
              overrideDurationMinutes: resolved.displayDurationMinutes,
              sessionDurationMinutes: session.durationMinutes,
              fallbackWorkoutDurationMinutes: representative.durationMinutes,
            }),
          );
          return (
            <Pressable
              key={session.id}
              style={({ pressed }) => [styles.recentRow, pressed && styles.recentRowPressed]}
              onPress={() => {
                router.push({
                  pathname:
                    domain === "strength"
                      ? "/(app)/workouts/day/[day]"
                      : "/(app)/cardio/day/[day]",
                  params: { day },
                });
              }}
              accessibilityRole="button"
              accessibilityLabel={`Open workout details ${representative.id}`}
            >
              <Text style={styles.recentDate}>{formatWorkoutDayLabel(day)}</Text>
              <View style={styles.recentMain}>
                <Text style={styles.recentTitle} numberOfLines={1}>
                  {representative.sourceId === "manual" &&
                  domain === "strength" &&
                  manualWorkoutNameByDay[day]
                    ? manualWorkoutNameByDay[day]
                    : resolved.displayTitle}
                </Text>
                <Text style={styles.recentMeta} numberOfLines={1}>
                  {durationLabel}
                </Text>
              </View>
              <Pressable
                onPress={(e) => {
                  e?.stopPropagation?.();
                  const native = e?.nativeEvent;
                  setWorkoutMenuAnchor({
                    x: typeof native?.pageX === "number" ? native.pageX : 320,
                    y: typeof native?.pageY === "number" ? native.pageY : 220,
                    width: 24,
                    height: 24,
                  });
                  setSelectedWorkoutForMenu({ day, session });
                  setWorkoutMenuOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Workout actions ${representative.id}`}
                hitSlop={10}
                style={styles.rowMenuBtn}
              >
                <Text style={styles.rowMenuText}>•••</Text>
              </Pressable>
            </Pressable>
          );
        })
      )}
    </View>
  );

  const content = (
    <View style={styles.pageBody}>
      {domain === "strength" ? (
        <>
          <TodayCard
            model={todayModel}
            onViewMore={() => router.push(`${basePath}/analytics-detail`)}
          />
          {recentCard}
          {weeklyInsightsCardModel != null ? (
            <WeeklyInsightsCard
              model={weeklyInsightsCardModel}
              onInsightPress={(insight) =>
                router.push({
                  pathname: "/(app)/workouts/analytics-detail",
                  params: serializeStrengthAnalyticsFocusParams(insight.destination),
                })
              }
            />
          ) : null}
        </>
      ) : (
        <>
          <WorkoutAnalyticsChart
            layout="single"
            domain={domain}
            headerTitle={String(WORKOUT_OVERVIEW_ANALYTICS_YEAR)}
            onViewMore={() => router.push(`${basePath}/analytics-detail`)}
            chartPoints={overviewAnalytics.chartPoints}
            metrics={overviewAnalytics.metrics}
          />
          {recentCard}
        </>
      )}

      <WorkoutActionSheet
        visible={workoutMenuOpen && !!selectedWorkoutForMenu}
        anchor={workoutMenuAnchor}
        onClose={closeWorkoutMenu}
        onViewDetails={() => {
          if (!selectedWorkoutForMenu) return;
          const { day } = selectedWorkoutForMenu;
          closeWorkoutMenu();
          router.push({
            pathname:
              domain === "strength" ? "/(app)/workouts/day/[day]" : "/(app)/cardio/day/[day]",
            params: { day },
          });
        }}
        onDoItAgain={() => {
          closeWorkoutMenu();
          router.push(domain === "strength" ? "/(app)/workouts/log" : "/(app)/cardio/log");
        }}
        onRename={() => openEditRoute("rename")}
        onEditDuration={() => openEditRoute("duration")}
        onEditType={() => openEditRoute("type")}
      />
    </View>
  );

  if (initializing) {
    return (
      <ModuleScreenShell title={shellTitle} subtitle={shellSubtitle} hideTitleChrome>
        <LoadingState message="Loading…" />
      </ModuleScreenShell>
    );
  }

  if (!user) {
    return (
      <ModuleScreenShell title={shellTitle} subtitle={shellSubtitle} hideTitleChrome>
        <EmptyState
          title={`Sign in to view ${shellTitle.toLowerCase()}`}
          description="Sign in to see your Apple Health data and synced sessions."
        />
      </ModuleScreenShell>
    );
  }

  return (
    <View style={styles.overviewRoot}>
      <ModuleScreenShell
        title={shellTitle}
        subtitle={shellSubtitle}
        hideTitleChrome
        compactHeader
        headerContent={
          <WeeklyStrip
            days={weeklyStripDays}
            selectedDay={today}
            onDayPress={(day) => {
              router.push({
                pathname:
                  domain === "strength" ? "/(app)/workouts/day/[day]" : "/(app)/cardio/day/[day]",
                params: { day },
              });
            }}
          />
        }
      >
        {content}
      </ModuleScreenShell>
      <WorkoutsOverviewBottomNav basePath={basePath} />
      {domain === "strength" && menuOpen && (
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setMenuOpen(false)}
          accessibilityLabel="Close menu"
        >
          <View style={styles.menuCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.menuTitle}>{shellTitle}</Text>
            <Text style={styles.menuSectionLabel}>Gym</Text>
            {getGymMenuOptions().map((opt) => {
              const selected =
                (opt.value === null && prefState.preferences.selectedGymId === null) ||
                (opt.value !== null && prefState.preferences.selectedGymId === opt.value);
              return (
                <Pressable
                  key={opt.value ?? "none"}
                  onPress={() => {
                    setSelectedGymId(opt.value);
                  }}
                  style={[styles.menuOptionRow, selected && styles.menuOptionRowSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Gym: ${opt.label}${selected ? ", selected" : ""}`}
                >
                  <Text style={styles.menuOptionLabel}>{opt.label}</Text>
                  {selected ? <Text style={styles.menuOptionCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setMenuOpen(false)}
              style={styles.primaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.primaryBtnText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      )}
    </View>
  );
}

export default function StrengthTrainingOverviewScreen() {
  return <TrainingOverviewScreen domain="strength" />;
}

const styles = StyleSheet.create({
  overviewRoot: {
    flex: 1,
  },
  pageBody: {
    backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
    flexGrow: 1,
    gap: 20,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: RADIUS,
    padding: 16,
    gap: 12,
  },
  placeholder: { fontSize: 15, fontWeight: "400", color: "#8E8E93", letterSpacing: -0.1 },
  primaryBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#007AFF",
    borderRadius: 10,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  metricRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metricLabel: { fontSize: 15, color: "#3C3C43" },
  metricValue: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  recentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  recentRowPressed: {
    opacity: 0.7,
  },
  recentDate: { width: 84, fontSize: 13, fontWeight: "400", color: "#8E8E93", letterSpacing: -0.1 },
  recentMain: { flex: 1, gap: 2 },
  recentTitle: { fontSize: 15, fontWeight: "500", color: "#1C1C1E", letterSpacing: -0.2 },
  recentMeta: { fontSize: 12, fontWeight: "400", color: "#AEAEB2", letterSpacing: -0.05 },
  rowMenuBtn: { paddingHorizontal: 10, paddingVertical: 6, marginTop: -2 },
  rowMenuText: { fontSize: 18, color: "#6E6E73", fontWeight: "700" },
  headerMenuBtn: { padding: 12 },
  headerMenuText: { fontSize: 18, color: "#1C1C1E", fontWeight: "700" },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    padding: 24,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  menuTitle: { fontSize: 20, fontWeight: "700", color: "#1C1C1E", textAlign: "center" },
  menuSectionLabel: { fontSize: 13, fontWeight: "600", color: "#6E6E73", marginTop: 4, marginBottom: 6 },
  menuOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
  },
  menuOptionRowSelected: { borderColor: "#007AFF", backgroundColor: "rgba(0,122,255,0.08)" },
  menuOptionLabel: { fontSize: 16, fontWeight: "500", color: "#1C1C1E" },
  menuOptionCheck: { fontSize: 16, fontWeight: "700", color: "#007AFF" },
  editorInput: {
    backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1C1C1E",
  },
  cancelBtn: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  cancelText: { fontSize: 15, color: "#6E6E73", fontWeight: "600" },
  cancelActionRow: {
    marginTop: 4,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
  },
  cancelActionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
});