

/**
 * Workouts Overview — W1 Apple Health integration.
 * Connection status, Strength Overview / Cardio analytics summary, recent workouts, last sync,
 * manual "Sync now". Fail-closed: requestId on all API failures.
 *
 * INGESTION: Steps and workouts only (existing kinds). Resting HR, active energy, exercise time:
 * contract kind="incomplete" allows only payload.note (no structured fields); we show them in UI only and do NOT ingest.
 */

import {
  UI_CARD_SURFACE,
  UI_HEADER_CHROME_BORDER,
  UI_SCREEN_BG,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
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
  Modal,
  Alert,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { LoadingState, EmptyState } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HeaderControls } from "@/lib/ui/HeaderControls";
import {
  WORKOUTS_SCREEN_CONTENT_BG,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";
import { WeeklyStrip } from "@/lib/ui/calendar/WeeklyStrip";
import { addCalendarDaysToDayKey, getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import { formatWeekdayFullFromDayKey } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import type { CalendarDay, DayKey, WorkoutDayMarker } from "@/lib/ui/calendar/types";
import {
  applyAuthoritativeWorkoutDeletionLocal,
  DEFAULT_WORKOUT_CALENDAR_RAW_EVENT_KINDS,
  useWorkoutsCalendarRange,
} from "@/lib/data/workouts/useWorkoutsCalendar";
import {
  WORKOUT_DAY_DEBUG_DATES,
  logWorkoutDayDebug,
  workoutDayDebugEnabled,
  workoutDayDebugFixRevision,
} from "@/lib/debug/workoutDayDebug";
import { filterWorkoutCalendarDaysInclusive } from "@/lib/data/workouts/overviewCalendarRangeSlices";
import {
  buildWorkoutOverviewAnalyticsFromCalendarDays,
  getCardioOverviewTabSessionsForCalendarDaysNewestFirst,
  getStrengthOverviewTabSessionsForCalendarDaysAscending,
  WORKOUT_OVERVIEW_ANALYTICS_RANGE_END,
  WORKOUT_OVERVIEW_ANALYTICS_RANGE_START,
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
import { deleteIngestedRawEventAuthed, ingestRawEvent } from "@/lib/api/ingest";
import { scheduleAppleHealthStepsRepair } from "@/lib/data/activity/appleHealthStepsRepairCoordinator";
import { shouldRun, nowIso } from "@/lib/sync/throttle";
import { resolveWorkoutDisplay, resolveWorkoutDisplayDurationMinutes } from "@/lib/data/workouts/workoutDisplay";
import {
  cardioDistanceTierFromWeeklyMiles,
  cardioDistanceTierIndexForBar,
  cardioDistanceTierLabel,
  cardioSessionDistanceMeters,
  formatCardioSessionHeadline,
  getThisWeekCardioSessions,
  sumDisplayableCardioDistanceMilesForWeekEntries,
} from "@/lib/data/workouts/cardioSessionPresentation";
import {
  deriveSessionTypeFlags,
  reconcileWorkoutSessionsForDay,
  resolveReconciledSessionWithLatestCalendarDays,
} from "@/lib/data/workouts/workoutSessionReconciliation";
import {
  buildWorkoutSessionSurfaceModel,
  pickJournalSummaryForStrengthSession,
  pickStrengthDeleteTargetWorkout,
  pickWorkoutForSessionActions,
  pickWorkoutOverrideForSession,
} from "@/lib/data/workouts/workoutSessionSurface";
import { clearWorkoutOverride, useWorkoutOverrides } from "@/lib/data/workouts/workoutOverrides";
import { WorkoutActionSheet } from "@/lib/ui/WorkoutActionSheet";
import type { WorkoutActionAnchor } from "@/lib/ui/WorkoutActionSheet";
import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import {
  listManualWorkoutDaySummaries,
  type ManualWorkoutDaySummary,
} from "@/lib/workouts/journal/manualWorkoutSummary";
import { listMergedCustomExerciseRecords } from "@/lib/workouts/exercises/mergeCustomExerciseSources";
import type { CustomExerciseRecord } from "@/lib/workouts/exercises/customExerciseStore";
import {
  buildWeeklyWorkingSetExerciseRowsByMuscle,
  buildWeeklyWorkingSetVolumeRows,
} from "@/lib/data/workouts/workoutDetailMuscleVolume";
import { subscribeWorkoutCalendarHydrateInvalidate } from "@/lib/data/workouts/workoutCalendarHydrateInvalidate";
import { WeeklyWorkingVolumeCard } from "@/lib/ui/workouts/WeeklyWorkingVolumeCard";

import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { PrimaryActionBarShell } from "@/lib/ui/workouts/PrimaryActionBarShell";
import {
  PRIMARY_TRAINING_CARD_PADDING_HORIZONTAL,
  programPrimaryCtaBarStyles,
} from "@/lib/ui/workouts/programPrimaryCtaBarStyles";
import { logShellLayoutAudit } from "@/lib/ui/workouts/shellLayoutAudit";
import { computeWorkoutOverviewSharedCalendarRange } from "@/lib/data/workouts/workoutOverviewSharedCalendarRange";
import { buildStrengthThisWeekSessionMetadataLine } from "@/lib/data/workouts/strengthThisWeekSessionRowMeta";
import { buildStrengthTodayCardModel } from "@/lib/data/workouts/strengthTodayCardModel";
import { StrengthFrequencyMetricCard } from "@/lib/ui/workouts/StrengthFrequencyMetricCard";
import {
  StrengthThisWeekCombinedCard,
  type StrengthThisWeekSessionRowModel,
} from "@/lib/ui/workouts/StrengthThisWeekCombinedCard";
import { StrengthProgramCard } from "@/lib/ui/workouts/StrengthProgramCard";
import { StrengthTodayCard } from "@/lib/ui/workouts/StrengthTodayCard";
import {
  STRENGTH_TODAY_MUSCLE_GROUP_PATHNAME,
  buildStrengthTodayMuscleGroupRouteParams,
} from "./today-muscle-group";
import { buildStrengthHistorySummaryModel } from "@/lib/data/workouts/strengthHistorySummaryModel";
import { StrengthHistorySummaryCard } from "@/lib/ui/workouts/StrengthHistorySummaryCard";
import { buildCardioHistorySummaryModel } from "@/lib/data/workouts/cardioHistorySummaryModel";
import { buildCardioTodayCardModel } from "@/lib/data/workouts/cardioTodayCardModel";
import { CardioHistorySummaryCard } from "@/lib/ui/workouts/CardioHistorySummaryCard";
import { CardioTodayCard } from "@/lib/ui/workouts/CardioTodayCard";
import { cardioBaselineMilesToVisualScale01 } from "@/lib/ui/workouts/cardioBaselineScale";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
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

export function TrainingOverviewScreen({ domain }: { domain: WorkoutProductDomain }) {
  const navigation = useNavigation();
  const router = useRouter();
  const basePath = basePathForDomain(domain);
  const shellTitle = shellTitleForDomain(domain);
  const shellSubtitle = shellSubtitleForDomain(domain);
  const { user, initializing, getIdToken } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("loading");
  const [workoutMenuOpen, setWorkoutMenuOpen] = useState(false);
  const [selectedWorkoutForMenu, setSelectedWorkoutForMenu] = useState<{
    day: string;
    session: ReconciledWorkoutSession;
  } | null>(null);
  const [workoutMenuAnchor, setWorkoutMenuAnchor] = useState<WorkoutActionAnchor | null>(null);
  const [pendingDeleteWorkoutId, setPendingDeleteWorkoutId] = useState<string | null>(null);
  const [deleteWorkoutSubmitting, setDeleteWorkoutSubmitting] = useState(false);
  const [manualWorkoutSummaries, setManualWorkoutSummaries] = useState<ManualWorkoutDaySummary[]>([]);
  const [customExerciseById, setCustomExerciseById] = useState<ReadonlyMap<string, CustomExerciseRecord>>(
    () => new Map(),
  );
  const today = getTodayDayKeyLocal();
  const anchorDay = today;
  const [workoutsCalendarRefreshEpoch, setWorkoutsCalendarRefreshEpoch] = useState(0);
  const [journalRefreshTick, setJournalRefreshTick] = useState(0);
  const workoutBackfillInFlightRef = useRef(false);
  const pendingPostBootstrapCoverageLogRef = useRef(false);

  const weekDaysFull = getWeekDaysForAnchor(anchorDay);
  const weekStart = weekDaysFull[0]!;
  const weekEnd = weekDaysFull[weekDaysFull.length - 1]!;
  const recentRangeStart = addCalendarDaysToDayKey(today, -120);
  const recentRangeEnd = today;
  const analyticsRangeStart = WORKOUT_OVERVIEW_ANALYTICS_RANGE_START;
  const analyticsRangeEnd = WORKOUT_OVERVIEW_ANALYTICS_RANGE_END;
  const { start: overviewRangeStart, end: overviewRangeEnd } = useMemo(
    () => computeWorkoutOverviewSharedCalendarRange(today),
    [today],
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

  useEffect(() => {
    return subscribeWorkoutCalendarHydrateInvalidate(() => {
      setJournalRefreshTick((n) => n + 1);
    });
  }, []);

  const durableTitlesByWorkoutId =
    overviewSharedRange.status === "ready" ? overviewSharedRange.durableTitlesByWorkoutId : {};

  const sharedDays = overviewSharedRange.status === "ready" ? overviewSharedRange.days : [];

  const domainSharedDays = useMemo(
    () => mapWorkoutCalendarDaysForDomain(sharedDays, domain),
    [sharedDays, domain],
  );

  /** Re-resolve menu session against latest hydrate so delete/edit ids stay valid after refresh while menu is open. */
  const overviewMenuSessionResolved = useMemo(() => {
    if (!selectedWorkoutForMenu) return null;
    if (overviewSharedRange.status !== "ready") return selectedWorkoutForMenu.session;
    return resolveReconciledSessionWithLatestCalendarDays(domainSharedDays, {
      day: selectedWorkoutForMenu.day as DayKey,
      session: selectedWorkoutForMenu.session,
    });
  }, [selectedWorkoutForMenu, domainSharedDays, overviewSharedRange.status]);

  const overviewMenuSessionRef = useRef(overviewMenuSessionResolved);
  overviewMenuSessionRef.current = overviewMenuSessionResolved;

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

  const workoutDayDebugOverviewSig = useMemo(
    () =>
      WORKOUT_DAY_DEBUG_DATES.map((d) => {
        const row = domainSharedDays.find((x) => x.day === d);
        const ids = row?.workouts.map((w) => w.id).join("|") ?? "";
        return `${d}:${row ? row.workouts.length : "missing"}:${ids}`;
      }).join(";"),
    [domainSharedDays],
  );

  useEffect(() => {
    if (!workoutDayDebugEnabled()) return;
    if (overviewSharedRange.status !== "ready") return;
    for (const d of WORKOUT_DAY_DEBUG_DATES) {
      const row = domainSharedDays.find((x) => x.day === d);
      if (!row) {
        logWorkoutDayDebug("overview-audit-day-not-in-hydrated-range", {
          day: d,
          domain,
          overviewRangeStart,
          overviewRangeEnd,
          note: "No calendar bucket for this day in the current overview hydrate (range or empty).",
        });
        continue;
      }
      const sessions = reconcileWorkoutSessionsForDay(d, row.workouts);
      logWorkoutDayDebug("overview-model-for-audit-day", {
        day: d,
        domain,
        workoutCount: row.workouts.length,
        workoutIds: row.workouts.map((w) => w.id),
        reconciledSessionCount: sessions.length,
        ...workoutDayDebugFixRevision(),
      });
    }
  }, [
    overviewSharedRange.status,
    domain,
    workoutDayDebugOverviewSig,
    overviewRangeStart,
    overviewRangeEnd,
  ]);

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

  const strengthWeekSessionsAscending = useMemo(() => {
    if (overviewSharedRange.status !== "ready" || domain !== "strength") return [];
    return getStrengthOverviewTabSessionsForCalendarDaysAscending(weekDaysSlice);
  }, [overviewSharedRange.status, domain, weekDaysSlice]);

  const weekWorkoutIds = useMemo(
    () =>
      weekDaysSlice.flatMap((d) =>
        reconcileWorkoutSessionsForDay(d.day, d.workouts).flatMap((s) => s.workouts.map((w) => w.id)),
      ),
    [weekDaysSlice],
  );

  const recentWorkoutIds = useMemo(
    () =>
      domain === "strength"
        ? strengthWeekSessionsAscending.flatMap((entry) => entry.session.workouts.map((w) => w.id))
        : [],
    [domain, strengthWeekSessionsAscending],
  );

  const workoutIdsForOverrides = useMemo(() => {
    const uniq = new Set<string>();
    for (const id of recentWorkoutIds) uniq.add(id);
    for (const id of weekWorkoutIds) uniq.add(id);
    return [...uniq];
  }, [recentWorkoutIds, weekWorkoutIds]);

  const { overridesByWorkoutId, reload } = useWorkoutOverrides(workoutIdsForOverrides);

  const workoutOverviewAnalyticsBundle = useMemo(() => {
    const bundle =
      overviewSharedRange.status === "ready"
        ? buildWorkoutOverviewAnalyticsFromCalendarDays(analyticsDaysSlice, { todayDayKey: today })
        : buildWorkoutOverviewAnalyticsFromCalendarDays([], { todayDayKey: today });
    return {
      strength: {
        chartPoints: bundle.chartPointsByTab.strength,
        metrics: bundle.metricsByTab.strength,
      },
      cardio: {
        chartPoints: bundle.chartPointsByTab.cardio,
        metrics: bundle.metricsByTab.cardio,
      },
    };
  }, [overviewSharedRange.status, analyticsDaysSlice, today]);

  const overviewAnalytics =
    domain === "strength" ? workoutOverviewAnalyticsBundle.strength : workoutOverviewAnalyticsBundle.cardio;

  useEffect(() => {
    if (process.env.JEST_WORKER_ID) return;
    if (domain !== "strength") {
      setCustomExerciseById(new Map());
      return;
    }
    if (!user?.uid) {
      setCustomExerciseById(new Map());
      return;
    }
    let cancelled = false;
    void listMergedCustomExerciseRecords(user.uid, () => getIdToken(false))
      .then((rows) => {
        if (cancelled) return;
        setCustomExerciseById(new Map(rows.map((r) => [r.exerciseId, r])));
      })
      .catch(() => {
        if (!cancelled) setCustomExerciseById(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [domain, user?.uid, getIdToken]);

  const strengthAnalyticsContext = useMemo(
    () => ({ customExerciseById }),
    [customExerciseById],
  );

  const strengthThisWeekSessionRows = useMemo((): StrengthThisWeekSessionRowModel[] => {
    if (domain !== "strength") return [];
    return strengthWeekSessionsAscending.map(({ day, session }) => {
      const journalSummary = pickJournalSummaryForStrengthSession(day, session, manualWorkoutSummaries);
      const surface = buildWorkoutSessionSurfaceModel(
        session,
        overridesByWorkoutId,
        "strength",
        journalSummary,
        durableTitlesByWorkoutId,
      );
      const sessionOverride = pickWorkoutOverrideForSession(session, overridesByWorkoutId);
      const resolvedMetrics = resolveWorkoutDisplay(
        surface.metricsWorkout,
        sessionOverride ?? overridesByWorkoutId[surface.metricsWorkout.id] ?? null,
      );
      const durationMinutes = resolveWorkoutDisplayDurationMinutes({
        overrideDurationMinutes: resolvedMetrics.displayDurationMinutes,
        sessionDurationMinutes: null,
        fallbackWorkoutDurationMinutes:
          surface.metricsWorkout.durationMinutes ?? session.durationMinutes,
      });
      return {
        dayKey: day,
        sessionId: session.id,
        displayTitle: surface.displayTitle,
        metadataLine: buildStrengthThisWeekSessionMetadataLine(
          journalSummary,
          surface.actionWorkout,
          durationMinutes,
          strengthAnalyticsContext,
        ),
        rowAccessibilityLabel: `Open workout details ${surface.actionWorkout.id}`,
        menuAccessibilityLabel: `Workout actions ${surface.actionWorkout.id}`,
      };
    });
  }, [
    domain,
    strengthWeekSessionsAscending,
    manualWorkoutSummaries,
    overridesByWorkoutId,
    durableTitlesByWorkoutId,
    strengthAnalyticsContext,
  ]);

  const manualJournalSummaryForToday = useMemo(
    () => manualWorkoutSummaries.find((s) => s.day === today) ?? null,
    [manualWorkoutSummaries, today],
  );

  const strengthTodayCardModel = useMemo(() => {
    if (domain !== "strength") return null;
    if (overviewSharedRange.status !== "ready") return null;
    return buildStrengthTodayCardModel({
      strengthCalendarDays: domainSharedDays,
      todayDayKey: today,
      manualJournalSummaryForToday,
      overridesByWorkoutId,
      durableTitlesByWorkoutId,
      analyticsCtx: strengthAnalyticsContext,
    });
  }, [
    domain,
    overviewSharedRange.status,
    domainSharedDays,
    today,
    manualJournalSummaryForToday,
    overridesByWorkoutId,
    durableTitlesByWorkoutId,
    strengthAnalyticsContext,
  ]);

  const strengthHistorySummaryModel = useMemo(() => {
    if (domain !== "strength") return null;
    if (overviewSharedRange.status !== "ready") return null;
    return buildStrengthHistorySummaryModel({
      strengthCalendarDays: domainSharedDays,
      todayDayKey: today,
      availableRangeStart: overviewRangeStart,
      availableRangeEnd: overviewRangeEnd,
    });
  }, [domain, overviewSharedRange.status, domainSharedDays, today, overviewRangeStart, overviewRangeEnd]);

  const cardioTodayCardModel = useMemo(() => {
    if (domain !== "cardio") return null;
    if (overviewSharedRange.status !== "ready") return null;
    return buildCardioTodayCardModel({
      cardioCalendarDays: domainSharedDays,
      todayDayKey: today,
      overridesByWorkoutId,
      durableTitlesByWorkoutId,
    });
  }, [domain, overviewSharedRange.status, domainSharedDays, today, overridesByWorkoutId, durableTitlesByWorkoutId]);

  const cardioHistorySummaryModel = useMemo(() => {
    if (domain !== "cardio") return null;
    if (overviewSharedRange.status !== "ready") return null;
    return buildCardioHistorySummaryModel({
      cardioCalendarDays: domainSharedDays,
      todayDayKey: today,
      availableRangeStart: overviewRangeStart,
      availableRangeEnd: overviewRangeEnd,
    });
  }, [domain, overviewSharedRange.status, domainSharedDays, today, overviewRangeStart, overviewRangeEnd]);

  const cardioWeekSessionsNewestFirst = useMemo(() => {
    if (overviewSharedRange.status !== "ready" || domain !== "cardio") return [];
    return getCardioOverviewTabSessionsForCalendarDaysNewestFirst(weekDaysSlice);
  }, [overviewSharedRange.status, domain, weekDaysSlice]);

  const cardioThisWeekSessions = useMemo(
    () => getThisWeekCardioSessions(cardioWeekSessionsNewestFirst, weekDaysFull),
    [cardioWeekSessionsNewestFirst, weekDaysFull],
  );

  const cardioThisWeekTotalMiles = useMemo(
    () => sumDisplayableCardioDistanceMilesForWeekEntries(cardioWeekSessionsNewestFirst),
    [cardioWeekSessionsNewestFirst],
  );

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
      return;
    }
    if (overviewSharedRange.status !== "ready") return;
    if (!user?.uid) {
      setManualWorkoutSummaries([]);
      return;
    }
    const task = runAfterInteractionsSafe(() => {
      void listManualWorkoutDaySummaries(user.uid, () => getIdToken(false)).then((rows) => {
        if (cancelled) return;
        setManualWorkoutSummaries(rows);
      });
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [domain, overviewSharedRange.status, user?.uid, workoutsCalendarRefreshEpoch, journalRefreshTick, getIdToken]);

  const weeklyWorkingVolumeRows = useMemo(() => {
    if (domain !== "strength") return [];
    return buildWeeklyWorkingSetVolumeRows(manualWorkoutSummaries, {
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
      analyticsCtx: strengthAnalyticsContext,
    });
  }, [domain, manualWorkoutSummaries, weekStart, weekEnd, strengthAnalyticsContext]);

  const weeklyWorkingVolumeExercisesByMuscleGroup = useMemo(() => {
    if (domain !== "strength" || weeklyWorkingVolumeRows.length === 0) return {};
    return buildWeeklyWorkingSetExerciseRowsByMuscle(manualWorkoutSummaries, {
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
      analyticsCtx: strengthAnalyticsContext,
    });
  }, [
    domain,
    weeklyWorkingVolumeRows.length,
    manualWorkoutSummaries,
    weekStart,
    weekEnd,
    strengthAnalyticsContext,
  ]);

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      headerRight: () => (
        <HeaderControls
          calendarAccessibilityLabel={`Open ${shellTitle.toLowerCase()} calendar`}
          onCalendarPress={() =>
            router.push(domain === "strength" ? "/(app)/workouts/calendar" : "/(app)/cardio/calendar")
          }
          {...(domain === "strength"
            ? {
                onOverflowPress: () => router.push("/(app)/workouts/settings"),
                overflowAccessibilityLabel: "Strength settings" as const,
              }
            : domain === "cardio"
              ? {
                  onOverflowPress: () => router.push("/(app)/cardio/settings"),
                  overflowAccessibilityLabel: "Cardio settings" as const,
                }
              : {})}
        />
      ),
      title: shellTitle,
    });
  }, [navigation, router, domain, shellTitle]);

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
        setWorkoutsCalendarRefreshEpoch((n) => n + 1);
        scheduleAppleHealthStepsRepair({
          trigger: "sync",
          getIdToken,
          forceRestart: false,
          ...(user?.uid ? { userUid: user.uid } : {}),
        });
      } finally {
        workoutBackfillInFlightRef.current = false;
      }
    },
    [connectionStatus, user, getIdToken],
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

  const beginDeleteStrengthWorkoutFromMenu = useCallback(() => {
    if (!selectedWorkoutForMenu || domain !== "strength") return;
    const session = overviewMenuSessionRef.current ?? selectedWorkoutForMenu.session;
    const workout = pickStrengthDeleteTargetWorkout(session);
    if (!workout) return;
    const rawEventId = (workout.id ?? "").trim();
    if (!rawEventId) return;
    closeWorkoutMenu();
    setPendingDeleteWorkoutId(rawEventId);
  }, [selectedWorkoutForMenu, domain, closeWorkoutMenu]);

  const confirmDeleteStrengthWorkout = useCallback(async () => {
    if (!pendingDeleteWorkoutId) return;
    const id = pendingDeleteWorkoutId;
    const token = await getIdToken(false);
    if (!token) {
      setPendingDeleteWorkoutId(null);
      Alert.alert("Couldn't delete workout", "Sign in again and try once more.");
      return;
    }
    setDeleteWorkoutSubmitting(true);
    const res = await deleteIngestedRawEventAuthed(id, token);
    setDeleteWorkoutSubmitting(false);

    if (res.ok) {
      if (user?.uid) {
        applyAuthoritativeWorkoutDeletionLocal(user.uid, id);
      }
      await clearWorkoutOverride(id);
      await reload();
      setPendingDeleteWorkoutId(null);
      setWorkoutsCalendarRefreshEpoch((n) => n + 1);
      return;
    }

    setPendingDeleteWorkoutId(null);

    const showDeleteFailureAlert =
      res.kind === "network" || res.status === 500 || res.status === 403;
    if (!showDeleteFailureAlert) {
      return;
    }

    let message = "Something went wrong. Your workouts were not changed.";
    if (res.status === 403) {
      message = "This workout can't be removed from Oli.";
    } else if (res.kind === "http" && typeof res.error === "string" && res.error.trim().length > 0) {
      const short = res.error.trim();
      if (short.length <= 140) message = short;
    } else if (res.kind === "network" && typeof res.error === "string" && res.error.trim().length > 0) {
      const short = res.error.trim();
      if (short.length <= 140) message = short;
    }

    Alert.alert("Couldn't delete workout", message);
  }, [pendingDeleteWorkoutId, getIdToken, reload, user?.uid]);

  const openEditRoute = useCallback(
    (mode: "rename" | "duration" | "type") => {
      if (!selectedWorkoutForMenu) return;
      const { day: sessionDay, session: staleSession } = selectedWorkoutForMenu;
      const session = overviewMenuSessionResolved ?? staleSession;
      const workout = pickWorkoutForSessionActions(session);
      if (!workout) return;
      const journalSummary =
        domain === "strength"
          ? pickJournalSummaryForStrengthSession(sessionDay, session, manualWorkoutSummaries)
          : null;
      const surface = buildWorkoutSessionSurfaceModel(
        session,
        overridesByWorkoutId,
        domain,
        journalSummary,
        durableTitlesByWorkoutId,
      );
      const sessionOverride = pickWorkoutOverrideForSession(session, overridesByWorkoutId);
      const resolvedAction = resolveWorkoutDisplay(
        workout,
        sessionOverride ?? overridesByWorkoutId[workout.id] ?? null,
      );
      const resolvedMetrics = resolveWorkoutDisplay(
        surface.metricsWorkout,
        sessionOverride ?? overridesByWorkoutId[surface.metricsWorkout.id] ?? null,
      );
      closeWorkoutMenu();
      router.push({
        pathname: `/(app)/workouts/edit/${mode}`,
        params: {
          workoutId: workout.id,
          currentTitle: surface.displayTitle,
          titleAnchorObservedAt: workout.start ?? workout.observedAt,
          currentDurationMinutes:
            typeof resolvedMetrics.displayDurationMinutes === "number"
              ? String(Math.round(resolvedMetrics.displayDurationMinutes))
              : "",
          currentWorkoutType: resolvedAction.displayWorkoutType,
        },
      });
    },
    [
      selectedWorkoutForMenu,
      overridesByWorkoutId,
      closeWorkoutMenu,
      router,
      domain,
      manualWorkoutSummaries,
      durableTitlesByWorkoutId,
      overviewMenuSessionResolved,
    ],
  );

  const strengthRecentWeekCombinedCard =
    domain === "strength" ? (
      <StrengthThisWeekCombinedCard
        loading={overviewSharedRange.status !== "ready"}
        emptyMessage="No strength workouts this week yet"
        sessions={strengthThisWeekSessionRows}
        onViewAll={() => router.push(`${basePath}/recent-workouts-full`)}
        onPressSession={(day) => {
          router.push({
            pathname: "/(app)/workouts/day/[day]",
            params: { day },
          });
        }}
        onPressSessionMenu={(day, sessionId, event) => {
          const hit = strengthWeekSessionsAscending.find(
            (entry) => entry.day === day && entry.session.id === sessionId,
          );
          if (!hit) return;
          const native = event?.nativeEvent;
          setWorkoutMenuAnchor({
            x: typeof native?.pageX === "number" ? native.pageX : 320,
            y: typeof native?.pageY === "number" ? native.pageY : 220,
            width: 24,
            height: 24,
          });
          setSelectedWorkoutForMenu({ day: hit.day, session: hit.session });
          setWorkoutMenuOpen(true);
        }}
      />
    ) : null;

  const cardioThisWeekCard =
    domain === "cardio" ? (
      <View style={styles.strengthRecentCombinedCard} testID="workouts-overview-this-week-combined-card">
        <StrengthFrequencyMetricCard
          variant="embedded"
          headingTitle="This Week"
          loading={overviewSharedRange.status !== "ready"}
          model={
            overviewSharedRange.status !== "ready"
              ? null
              : {
                  compactValuePrimary: `${cardioThisWeekTotalMiles.toFixed(1)} mi`,
                  ratingLabel: cardioDistanceTierLabel(
                    cardioDistanceTierFromWeeklyMiles(cardioThisWeekTotalMiles),
                  ),
                  activityTierIndexForBar: cardioDistanceTierIndexForBar(
                    cardioDistanceTierFromWeeklyMiles(cardioThisWeekTotalMiles),
                  ),
                  fillWidth01Override: cardioBaselineMilesToVisualScale01(cardioThisWeekTotalMiles),
                }
          }
          footerCaption=""
          showFrequencyTrack={false}
          showFrequencyMarkers={false}
          showFooterCaption={false}
          compactTitlePillSpacing
          titleRowTrailing={
            <Pressable
              onPress={() => router.push(`${basePath}/recent-workouts-full`)}
              accessibilityRole="button"
              accessibilityLabel="View all"
              hitSlop={8}
              style={({ pressed }) => [
                workoutOverviewInCardHeaderStyles.linkHit,
                pressed && workoutOverviewInCardHeaderStyles.linkPressed,
              ]}
              testID="cardio-this-week-view-more"
            >
              <Text style={workoutOverviewInCardHeaderStyles.link}>View All →</Text>
            </Pressable>
          }
          ratingPillTestID="cardio-this-week-rating-pill"
          frequencyBarTestID="cardio-this-week-frequency-bar"
          instrumentClusterTestID="cardio-this-week-instrument-cluster"
        />
        <View style={styles.strengthRecentSectionDivider} />
        {overviewSharedRange.status !== "ready" ? null : cardioThisWeekSessions.length === 0 ? (
          <Text style={styles.placeholder}>No cardio sessions this week yet</Text>
        ) : (
          cardioThisWeekSessions.map(({ day, session }, rowIndex) => {
            const representative = session.workouts[0];
            if (!representative) return null;
            const journalSummary = null;
            const surface = buildWorkoutSessionSurfaceModel(
              session,
              overridesByWorkoutId,
              domain,
              journalSummary,
              durableTitlesByWorkoutId,
            );
            const sessionOverride = pickWorkoutOverrideForSession(session, overridesByWorkoutId);
            const resolvedMetrics = resolveWorkoutDisplay(
              surface.metricsWorkout,
              sessionOverride ?? overridesByWorkoutId[surface.metricsWorkout.id] ?? null,
            );
            const resolvedDuration = resolveWorkoutDisplayDurationMinutes({
              overrideDurationMinutes: resolvedMetrics.displayDurationMinutes,
              sessionDurationMinutes: null,
              fallbackWorkoutDurationMinutes:
                surface.metricsWorkout.durationMinutes ?? session.durationMinutes,
            });
            const headline = formatCardioSessionHeadline({
              distanceMeters: cardioSessionDistanceMeters(session),
              durationMinutes: resolvedDuration,
            });
            return (
              <Pressable
                key={`week-${session.id}`}
                style={({ pressed }) => [
                  styles.recentRow,
                  rowIndex === 0 && styles.recentRowFirst,
                  pressed && styles.recentRowPressed,
                ]}
                onLayout={(e) => logShellLayoutAudit(`this-week-row-pressable:cardio:${session.id}`, e)}
                onPress={() => {
                  router.push({
                    pathname: "/(app)/cardio/day/[day]",
                    params: { day },
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel={`Open workout details ${surface.actionWorkout.id}`}
              >
                <View style={styles.recentRowTextCol}>
                  <Text style={styles.recentDate}>{formatWeekdayFullFromDayKey(day)}</Text>
                  <PrimaryActionBarShell
                    layout="row"
                    style={styles.strengthThisWeekRowShell}
                    testID="workouts-overview-this-week-row-value-bar"
                  >
                    <View style={programPrimaryCtaBarStyles.thisWeekRowTitleCell}>
                      <Text style={programPrimaryCtaBarStyles.ctaBarLabel} numberOfLines={1} ellipsizeMode="tail">
                        {headline}
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
                      accessibilityLabel={`Workout actions ${surface.actionWorkout.id}`}
                      hitSlop={10}
                      style={programPrimaryCtaBarStyles.rowMenuBtn}
                    >
                      <Text style={programPrimaryCtaBarStyles.rowMenuGlyph}>•••</Text>
                    </Pressable>
                  </PrimaryActionBarShell>
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    ) : null;

  const content = (
    <View style={styles.pageBody}>
      {domain === "strength" ? (
        <>
          <StrengthProgramCard
            testID="strength-program-card"
            onCreateProgram={() => router.push("/(app)/workouts/plan")}
          />
          <StrengthTodayCard
            loading={overviewSharedRange.status !== "ready"}
            model={strengthTodayCardModel}
            onPressLog={() => router.push(`${basePath}/log`)}
            onSelectMuscleGroup={(selection) =>
              router.push({
                pathname: STRENGTH_TODAY_MUSCLE_GROUP_PATHNAME,
                params: buildStrengthTodayMuscleGroupRouteParams({
                  muscleGroup: selection.muscleGroup,
                  totalSetCount: selection.totalSetCount,
                  exercises: selection.exercises,
                }),
              })
            }
          />
          {strengthRecentWeekCombinedCard}
          {weeklyWorkingVolumeRows.length > 0 ? (
            <WeeklyWorkingVolumeCard
              rows={weeklyWorkingVolumeRows}
              exercisesByMuscleGroup={weeklyWorkingVolumeExercisesByMuscleGroup}
              onSelectMuscleGroup={(selection) =>
                router.push({
                  pathname: STRENGTH_TODAY_MUSCLE_GROUP_PATHNAME,
                  params: buildStrengthTodayMuscleGroupRouteParams({
                    muscleGroup: selection.muscleGroup,
                    totalSetCount: selection.totalSetCount,
                    exercises: selection.exercises,
                  }),
                })
              }
            />
          ) : null}
          {strengthHistorySummaryModel ? (
            <StrengthHistorySummaryCard
              model={strengthHistorySummaryModel}
              onPressViewMore={() => router.push(`${basePath}/analytics-detail`)}
              onPressStrengthRangeExplainer={(ctx) =>
                router.push({
                  pathname: "/(app)/workouts/strength-range-explainer",
                  params: {
                    avg:
                      ctx.averageSessionsPerWeek != null && Number.isFinite(ctx.averageSessionsPerWeek)
                        ? String(ctx.averageSessionsPerWeek)
                        : "",
                    window: ctx.rowLabel,
                    tierBand: String(ctx.tierIndexForBar),
                    tierLabel: ctx.tierLabel,
                  },
                })
              }
            />
          ) : null}
        </>
      ) : (
        <>
          <CardioTodayCard
            loading={overviewSharedRange.status !== "ready"}
            model={cardioTodayCardModel}
            onPressLog={() => router.push(`${basePath}/log`)}
          />
          {cardioThisWeekCard}
          {cardioHistorySummaryModel ? (
            <CardioHistorySummaryCard
              model={cardioHistorySummaryModel}
              onPressViewMore={() => router.push(`${basePath}/analytics-detail`)}
              onPressCardioRangeExplainer={(ctx) =>
                router.push({
                  pathname: "/(app)/cardio/cardio-range-explainer",
                  params: {
                    window: ctx.rowLabel,
                    tierIndex: String(ctx.tierIndexForBar),
                    tierLabel: ctx.tierLabel,
                    displayValue: ctx.displayValue,
                  },
                })
              }
            />
          ) : null}
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
        {...(domain === "strength" &&
        overviewMenuSessionResolved &&
        pickStrengthDeleteTargetWorkout(overviewMenuSessionResolved) != null
          ? { onDeleteWorkout: beginDeleteStrengthWorkoutFromMenu }
          : {})}
      />

      <Modal
        visible={pendingDeleteWorkoutId != null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleteWorkoutSubmitting) setPendingDeleteWorkoutId(null);
        }}
        presentationStyle="overFullScreen"
      >
        <Pressable
          style={styles.deleteConfirmBackdrop}
          onPress={() => {
            if (!deleteWorkoutSubmitting) setPendingDeleteWorkoutId(null);
          }}
          accessibilityLabel="Close delete workout confirmation"
        >
          <Pressable style={styles.deleteConfirmCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.deleteConfirmTitle}>Delete workout?</Text>
            <Text style={styles.deleteConfirmBody} accessibilityLabel="Delete workout confirmation body">
              This will remove this workout from Oli and update your strength history.
            </Text>
            <View style={styles.deleteConfirmActions}>
              <Pressable
                onPress={() => {
                  if (!deleteWorkoutSubmitting) setPendingDeleteWorkoutId(null);
                }}
                style={styles.deleteConfirmCancelBtn}
                accessibilityRole="button"
                accessibilityLabel="Cancel delete workout"
              >
                <Text style={styles.deleteConfirmCancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void confirmDeleteStrengthWorkout()}
                disabled={deleteWorkoutSubmitting}
                style={[styles.deleteConfirmDangerBtn, deleteWorkoutSubmitting && styles.deleteConfirmDangerBtnDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Confirm delete workout"
              >
                <Text style={styles.deleteConfirmDangerLabel}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  );
}

export default function StrengthTrainingOverviewScreen() {
  return <TrainingOverviewScreen domain="strength" />;
}

const styles = StyleSheet.create({
  pageBody: {
    backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    flexGrow: 1,
    gap: 20,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: RADIUS,
    padding: 14,
    gap: 10,
    ...elevatedCardSurfaceStyle,
  },
  /** Combined Strength “This Week” header (summary + inline View More) + in-week list — see StrengthFrequencyMetricCard `embedded`. */
  strengthRecentCombinedCard: {
    backgroundColor: CARD_BG,
    borderRadius: RADIUS,
    paddingHorizontal: PRIMARY_TRAINING_CARD_PADDING_HORIZONTAL,
    /** Match {@link StrengthProgramCard} card vertical padding (13) for CTA-adjacent rhythm. */
    paddingTop: 13,
    paddingBottom: 13,
    /** Match Program card `gap: 10` between header block, divider, and rows. */
    gap: 10,
    ...elevatedCardSurfaceStyle,
  },
  strengthRecentSectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_HEADER_CHROME_BORDER,
    marginVertical: 0,
    marginHorizontal: 0,
    alignSelf: "stretch",
  },
  placeholder: { fontSize: 15, fontWeight: "400", color: UI_TEXT_TERTIARY_LABEL, letterSpacing: -0.1 },
  metricRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metricLabel: { fontSize: 15, color: UI_TEXT_SECONDARY },
  metricValue: { fontSize: 15, fontWeight: "600", color: UI_TEXT_PRIMARY },
  recentRow: {
    flexDirection: "column",
    alignItems: "stretch",
    /** No extra vertical cushion — shell height matches Program CTA; spacing vs weekday uses `recentRowTextCol.gap`. */
    paddingVertical: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_HEADER_CHROME_BORDER,
    gap: 2,
  },
  /** Most recent session: no rule above so the list reads as one block from the header. */
  recentRowFirst: {
    borderTopWidth: 0,
  },
  recentRowPressed: {
    opacity: 0.7,
  },
  recentRowTextCol: {
    flex: 1,
    minWidth: 0,
    /** Match Program card `gap: 10` above Create Program (body → CTA). */
    gap: 10,
  },
  strengthThisWeekRowShell: {
    backgroundColor: UI_CARD_SURFACE,
  },
  recentDate: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "500",
    color: UI_TEXT_TERTIARY_LABEL,
    letterSpacing: -0.05,
  },
  editorInput: {
    backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: UI_TEXT_PRIMARY,
  },
  cancelBtn: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  cancelText: { fontSize: 15, color: UI_TEXT_TERTIARY_LABEL, fontWeight: "600" },
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
    color: UI_TEXT_PRIMARY,
  },
  deleteConfirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  deleteConfirmCard: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 320,
  },
  deleteConfirmTitle: { fontSize: 18, fontWeight: "800", color: UI_TEXT_PRIMARY, marginBottom: 8 },
  deleteConfirmBody: { fontSize: 14, color: UI_TEXT_SECONDARY, lineHeight: 20 },
  deleteConfirmActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  deleteConfirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: UI_SCREEN_BG,
    alignItems: "center",
  },
  deleteConfirmCancelLabel: { fontSize: 15, fontWeight: "700", color: UI_TEXT_PRIMARY },
  deleteConfirmDangerBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FFD6D6",
    alignItems: "center",
  },
  deleteConfirmDangerBtnDisabled: { opacity: 0.55 },
  deleteConfirmDangerLabel: { fontSize: 15, fontWeight: "700", color: "#FF3B30" },
});