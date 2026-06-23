

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
import {
  addCalendarDaysToDayKey,
  getTodayDayKeyLocal,
  getWeekDaysForAnchor,
  getWeekStartSunday,
} from "@/lib/ui/calendar/dateUtils";
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
import { computeEnergyWeekNavigationState } from "@/lib/data/dash/energyWeekNavigation";
import {
  pullTodaySnapshot,
  pullAnchoredWorkouts,
  pullWorkoutsByDateRange,
  toHealthKitIso8601,
  stepsIdempotencyKey,
  workoutIdempotencyKey,
  getStepCountForDateRange,
  runAppleHealthWorkoutPhysiologyDiagnostic,
  runAppleHealthWorkoutPhysiologyEnrichment,
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
  runRecentWorkoutRepair,
  type RecentWorkoutRepairReason,
} from "@/lib/integrations/appleHealth/runRecentWorkoutRepair";
import {
  getLocalCalendarDayBoundsFromYmd,
  addLocalCalendarDaysToDayKey,
} from "@/lib/integrations/appleHealth/healthKit";
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
  getAppleHealthWorkoutsRecentRepairLastRunAt,
  setAppleHealthWorkoutsRecentRepairLastRunAt,
} from "@/lib/integrations/appleHealth/storage";
import { deleteIngestedRawEventAuthed, ingestRawEvent } from "@/lib/api/ingest";
import { scheduleAppleHealthStepsRepair } from "@/lib/data/activity/appleHealthStepsRepairCoordinator";
import { shouldRun, nowIso } from "@/lib/sync/throttle";
import { resolveWorkoutDisplay, resolveWorkoutDisplayDurationMinutes } from "@/lib/data/workouts/workoutDisplay";
import {
  cardioSessionDistanceMeters,
  formatCardioSessionHeadline,
  getThisWeekCardioSessions,
  resolveCardioSessionDisplayName,
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
  resolveStrengthSessionExerciseDisplay,
} from "@/lib/data/workouts/workoutSessionSurface";
import { collectStrengthOverviewTabSessions } from "@/lib/data/workouts/strengthOverviewCardModel";
import { pickLatestStrengthSessionToday } from "@/lib/data/workouts/strengthTodayCardModel";
import { pickSessionHeartRateZoneMinutes } from "@/lib/data/workouts/pickSessionHeartRateZoneMinutes";
import { pickSessionOnlyAverageHeartRateBpmFallback } from "@/lib/data/workouts/resolveStrengthTodayAverageHeartRateBpm";
import { buildStrengthTodayDetailVm } from "@/lib/data/workouts/strengthTodayDetailVm";
import { useDailyEnergyCard } from "@/lib/data/dash/useDailyEnergyCard";
import {
  STRENGTH_TODAY_HR_DETAIL_PATHNAME,
  buildStrengthTodayHrDetailRouteParams,
} from "./strength-today-hr-detail";
import {
  CARDIO_TODAY_HR_DETAIL_PATHNAME,
  buildCardioTodayHrDetailRouteParams,
} from "./cardio-today-hr-detail";
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
import { WeeklyHypertrophyStimulusCard } from "@/lib/ui/workouts/WeeklyHypertrophyStimulusCard";
import { buildWeeklyHypertrophyStimulusCardModelFromJournal } from "@/lib/data/workouts/weeklyHypertrophyStimulusCardModel";

import { PRIMARY_TRAINING_CARD_PADDING_HORIZONTAL } from "@/lib/ui/workouts/programPrimaryCtaBarStyles";
import { computeWorkoutOverviewSharedCalendarRange } from "@/lib/data/workouts/workoutOverviewSharedCalendarRange";
import { buildStrengthThisWeekSessionMetadataLine } from "@/lib/data/workouts/strengthThisWeekSessionRowMeta";
import { buildStrengthTodayCardModel } from "@/lib/data/workouts/strengthTodayCardModel";
import {
  StrengthThisWeekCombinedCard,
  type StrengthThisWeekSessionRowModel,
} from "@/lib/ui/workouts/StrengthThisWeekCombinedCard";
import { StrengthTodayCard } from "@/lib/ui/workouts/StrengthTodayCard";
import {
  STRENGTH_TODAY_MUSCLE_GROUP_PATHNAME,
  buildStrengthTodayMuscleGroupRouteParams,
} from "./today-muscle-group";
import { buildStrengthHistorySummaryModel } from "@/lib/data/workouts/strengthHistorySummaryModel";
import { StrengthHistorySummaryCard } from "@/lib/ui/workouts/StrengthHistorySummaryCard";
import {
  buildStrengthYearlyCardModel,
  countStrengthSessionsByMonthFromCalendarDays,
  mapWorkoutMonthSummariesToStrengthMonthlyCounts,
} from "@/lib/data/workouts/strengthYearlyCardModel";
import { useStrengthYearlyMonthSummaries } from "@/lib/data/workouts/useStrengthYearlyMonthSummaries";
import { computeActivityYearNavigationState } from "@/lib/data/activity/activityYearNavigation";
import { StrengthYearlyCard } from "@/lib/ui/workouts/StrengthYearlyCard";
import { buildCardioHistorySummaryModel } from "@/lib/data/workouts/cardioHistorySummaryModel";
import { buildCardioTodayCardModel } from "@/lib/data/workouts/cardioTodayCardModel";
import {
  buildCardioTodayDetailVm,
  listTodayCardioSessionsForDetailVm,
} from "@/lib/data/workouts/cardioTodayDetailVm";
import {
  buildCardioWeeklyDistanceCardModel,
  buildCardioWeeklyDurationCardModel,
  formatCardioWeeklyDistanceBarLabel,
  formatCardioWeeklyDurationBarLabel,
} from "@/lib/data/workouts/cardioWeeklyMetricCardModel";
import {
  buildCardioYearlyCardModel,
  sumCardioMilesByMonthFromCalendarDays,
} from "@/lib/data/workouts/cardioYearlyCardModel";
import { CardioHistorySummaryCard } from "@/lib/ui/workouts/CardioHistorySummaryCard";
import { CardioThisWeekCard, type CardioThisWeekSessionRow } from "@/lib/ui/workouts/CardioThisWeekCard";
import { CardioTodayCard } from "@/lib/ui/workouts/CardioTodayCard";
import { CardioWeeklyMetricCard } from "@/lib/ui/workouts/CardioWeeklyMetricCard";
import { CardioYearlyCard } from "@/lib/ui/workouts/CardioYearlyCard";
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
// Bump when existing installs need to re-run the workout history backfill so
// already-ingested raw events can re-send richer payloads through the idempotent
// `POST /ingest` replay branch (which patches via
// `mergeAppleHealthWorkoutPhysiologyIfNeeded`). The fall-through then re-runs
// canonical supersede + DailyFacts recompute. Do NOT change anchor semantics.
const WORKOUT_DEEP_BACKFILL_VERSION = "v14-physiology";
const WORKOUT_DEEP_BACKFILL_IN_PROGRESS = "v14-physiology:in_progress";
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
  /**
   * Strength "This Week" card week navigator anchor. Kept completely separate from
   * the header `WeeklyStrip` (which always shows the current week and selects `today`)
   * and from any `/(app)/workouts/day/[day]` route param. Initialised to the Sunday of
   * the current local week so the card opens on the current week with forward disabled.
   * Mirrors Activity / Sleep / Energy "This Week" navigation.
   */
  const [selectedWeekAnchorDay, setSelectedWeekAnchorDay] = useState<DayKey>(() =>
    getWeekStartSunday(today),
  );
  /**
   * Weekly Volume card week navigator anchor. **Independent** of `selectedDay`,
   * `selectedWeekAnchorDay` (Strength This Week), the WeeklyStrip, route params, and the cardio
   * branch (which never mounts this card). Drives only the displayed muscle-group volume slice
   * — never touches the header calendar or the This Week card.
   */
  const [selectedVolumeWeekAnchorDay, setSelectedVolumeWeekAnchorDay] = useState<DayKey>(() =>
    getWeekStartSunday(today),
  );
  /**
   * Yearly Strength card — currently displayed year. Defaults to the current calendar year so
   * the card opens on `2026 Strength` with forward navigation disabled. **Independent** of
   * `selectedDay`, `selectedWeekAnchorDay`, the WeeklyStrip, route params, and the cardio branch
   * (which never mounts the yearly card).
   */
  const [selectedStrengthYear, setSelectedStrengthYear] = useState<number>(() =>
    Number.parseInt(today.slice(0, 4), 10),
  );
  /**
   * Cardio "This Week" card week navigator anchor. Mirrors {@link selectedWeekAnchorDay}'s role
   * for Strength: drives only the Cardio This Week card (rows + range label + chevron
   * enablement). Independent of the WeeklyStrip / route params / strength branch.
   */
  const [selectedCardioWeekAnchorDay, setSelectedCardioWeekAnchorDay] = useState<DayKey>(() =>
    getWeekStartSunday(today),
  );
  /**
   * Weekly Distance card week navigator — independent so the user can drill into past distance
   * weeks without nudging the This Week list. Mirrors the Strength volume vs This Week split.
   */
  const [selectedCardioDistanceWeekAnchorDay, setSelectedCardioDistanceWeekAnchorDay] =
    useState<DayKey>(() => getWeekStartSunday(today));
  /** Weekly Duration card week navigator — independent (same rationale as Weekly Distance). */
  const [selectedCardioDurationWeekAnchorDay, setSelectedCardioDurationWeekAnchorDay] =
    useState<DayKey>(() => getWeekStartSunday(today));
  /**
   * Yearly Cardio card — currently displayed year. Defaults to the current calendar year so the
   * card opens on `2026 Cardio` with forward navigation disabled. Mirrors
   * {@link selectedStrengthYear}.
   */
  const [selectedCardioYear, setSelectedCardioYear] = useState<number>(() =>
    Number.parseInt(today.slice(0, 4), 10),
  );
  const [workoutsCalendarRefreshEpoch, setWorkoutsCalendarRefreshEpoch] = useState(0);
  const [journalRefreshTick, setJournalRefreshTick] = useState(0);
  const workoutBackfillInFlightRef = useRef(false);
  const recentWorkoutRepairInFlightRef = useRef(false);
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

  /**
   * Strength "This Week" nav-week derivation. Drives only the strength `This Week` card
   * (rows + range label + chevron enablement). The header `WeeklyStrip`, `weekDaysSlice`,
   * `weekWorkoutIds`, and all cardio computations remain on the current calendar week.
   */
  const strengthWeekNav = useMemo(
    () =>
      computeEnergyWeekNavigationState({
        todayDayKey: today,
        weekAnchorDay: selectedWeekAnchorDay,
      }),
    [today, selectedWeekAnchorDay],
  );
  const handlePressStrengthPreviousWeek = useCallback(() => {
    setSelectedWeekAnchorDay(strengthWeekNav.previousWeekAnchor);
  }, [strengthWeekNav.previousWeekAnchor]);
  const handlePressStrengthNextWeek = useCallback(() => {
    if (strengthWeekNav.nextWeekAnchor != null) {
      setSelectedWeekAnchorDay(strengthWeekNav.nextWeekAnchor);
    }
  }, [strengthWeekNav.nextWeekAnchor]);
  const strengthNavWeekDaysSlice = useMemo(
    () =>
      filterWorkoutCalendarDaysInclusive(
        domainSharedDays,
        strengthWeekNav.weekStart,
        strengthWeekNav.weekEnd,
      ),
    [domainSharedDays, strengthWeekNav.weekStart, strengthWeekNav.weekEnd],
  );

  /**
   * Weekly Volume card week navigator derivation. Drives only the muscle-group volume rows +
   * range label + chevron enablement on {@link WeeklyWorkingVolumeCard}. Completely independent
   * of `selectedDay`, `selectedWeekAnchorDay`, the header `WeeklyStrip`, and the cardio branch.
   */
  const strengthVolumeWeekNav = useMemo(
    () =>
      computeEnergyWeekNavigationState({
        todayDayKey: today,
        weekAnchorDay: selectedVolumeWeekAnchorDay,
      }),
    [today, selectedVolumeWeekAnchorDay],
  );
  const handlePressStrengthVolumePreviousWeek = useCallback(() => {
    setSelectedVolumeWeekAnchorDay(strengthVolumeWeekNav.previousWeekAnchor);
  }, [strengthVolumeWeekNav.previousWeekAnchor]);
  const handlePressStrengthVolumeNextWeek = useCallback(() => {
    if (strengthVolumeWeekNav.nextWeekAnchor != null) {
      setSelectedVolumeWeekAnchorDay(strengthVolumeWeekNav.nextWeekAnchor);
    }
  }, [strengthVolumeWeekNav.nextWeekAnchor]);
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

  /**
   * Sessions rendered in the strength "This Week" card. Always sourced from the
   * **displayed** strength nav-week slice (see {@link strengthNavWeekDaysSlice}). On the
   * default mount this equals the current calendar week so existing current-week tests and
   * UX are unchanged; navigating via the card chevrons re-derives this list for the
   * prior/next week without touching the header `WeeklyStrip` or cardio computations.
   */
  const strengthWeekSessionsAscending = useMemo(() => {
    if (overviewSharedRange.status !== "ready" || domain !== "strength") return [];
    return getStrengthOverviewTabSessionsForCalendarDaysAscending(strengthNavWeekDaysSlice);
  }, [overviewSharedRange.status, domain, strengthNavWeekDaysSlice]);

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

  /**
   * Exercises for the strength session picked by {@link strengthTodayCardModel} — same selector
   * (`resolveStrengthSessionExerciseDisplay`) the card model already uses. Surfacing the list
   * here keeps the new {@link buildStrengthTodayDetailVm} call pure (no internal session-picking)
   * and gives us the single `Total Volume` set count via `sumWorkoutDetailTotalVolumeSets`.
   */
  const strengthTodayActionExercises = useMemo(() => {
    if (domain !== "strength") return [];
    if (overviewSharedRange.status !== "ready") return [];
    if (strengthTodayCardModel == null || strengthTodayCardModel.kind !== "completed") return [];
    const todayRow = domainSharedDays.find((d) => d.day === today);
    if (todayRow == null) return [];
    const sessions = collectStrengthOverviewTabSessions([
      { day: today, workouts: todayRow.workouts },
    ]);
    const latest = pickLatestStrengthSessionToday(sessions);
    if (latest == null) return [];
    const surface = buildWorkoutSessionSurfaceModel(
      latest,
      overridesByWorkoutId,
      "strength",
      manualJournalSummaryForToday,
      durableTitlesByWorkoutId,
    );
    return resolveStrengthSessionExerciseDisplay(
      manualJournalSummaryForToday,
      surface.actionWorkout,
    ).exercises;
  }, [
    domain,
    overviewSharedRange.status,
    strengthTodayCardModel,
    domainSharedDays,
    today,
    overridesByWorkoutId,
    manualJournalSummaryForToday,
    durableTitlesByWorkoutId,
  ]);

  /**
   * Daily Energy DTO for {@link today}. Strength-only consumer — gated by `domain === "strength"`
   * via a dedicated hook that no-ops on cardio (Sleep / Activity are unaffected). This is the
   * single source for the Strength Today card's Estimated Calorie Burn row + Avg heart rate row,
   * and is reused by the `strength-today-hr-detail` modal screen for parity.
   */
  const strengthTodaySessions = useMemo(() => {
    if (domain !== "strength") return [];
    if (overviewSharedRange.status !== "ready") return [];
    const todayRow = domainSharedDays.find((d) => d.day === today);
    if (todayRow == null) return [];
    return collectStrengthOverviewTabSessions([{ day: today, workouts: todayRow.workouts }]);
  }, [domain, overviewSharedRange.status, domainSharedDays, today]);

  const dailyEnergyCardForToday = useDailyEnergyCard(today);
  const strengthTodayDetailVm = useMemo(() => {
    if (domain !== "strength") return null;
    if (overviewSharedRange.status !== "ready") return null;
    return buildStrengthTodayDetailVm({
      todayDayKey: today,
      cardModel: strengthTodayCardModel,
      actionWorkoutExercises: strengthTodayActionExercises,
      sessionId: manualJournalSummaryForToday?.sessionId ?? null,
      energy: dailyEnergyCardForToday.energy,
      todayStrengthSessions: strengthTodaySessions,
    });
  }, [
    domain,
    overviewSharedRange.status,
    today,
    strengthTodayCardModel,
    strengthTodayActionExercises,
    manualJournalSummaryForToday?.sessionId,
    dailyEnergyCardForToday.energy,
    strengthTodaySessions,
  ]);
  /**
   * Session-level HR-zone fallbacks for the Strength + Cardio HR detail modals.
   *
   * The modals primarily read `dailyFacts.{strength,cardio}.heartRateZoneMinutes` (via
   * `energy.energyInfluencers`). On days that haven't been recomputed since the Phase C
   * deploy that aggregate can be missing while the canonical workout event ALREADY
   * carries the zones from Phase B enrichment. Passing the picked session's zone tuple
   * through route params lets the modal render real durations immediately, without
   * waiting for a `recomputeForDay`. No raw mutation, no invented zones — when the
   * picked session also lacks valid zones we omit the route param and the modal falls
   * back to the standard "zones aren't available yet" copy.
   */
  const strengthTodaySessionZoneMinutesFallback = useMemo(() => {
    if (domain !== "strength") return null;
    if (strengthTodaySessions.length === 0) return null;
    const latest = pickLatestStrengthSessionToday(strengthTodaySessions);
    return pickSessionHeartRateZoneMinutes(latest);
  }, [domain, strengthTodaySessions]);

  const strengthTodaySessionAvgHrFallback = useMemo(
    () => pickSessionOnlyAverageHeartRateBpmFallback(strengthTodaySessions),
    [strengthTodaySessions],
  );

  const cardioTodaySessionZoneMinutesFallback = useMemo(() => {
    if (domain !== "cardio") return null;
    if (overviewSharedRange.status !== "ready") return null;
    const todayRow = domainSharedDays.find((d) => d.day === today);
    if (todayRow == null) return null;
    const sessions = reconcileWorkoutSessionsForDay(todayRow.day, todayRow.workouts);
    const cardioSessions = listTodayCardioSessionsForDetailVm(sessions);
    const heroSession = cardioSessions[0] ?? null;
    return pickSessionHeartRateZoneMinutes(heroSession);
  }, [domain, overviewSharedRange.status, domainSharedDays, today]);

  const handlePressStrengthTodayAvgHeartRate = useCallback(
    (day: DayKey) => {
      router.push({
        pathname: STRENGTH_TODAY_HR_DETAIL_PATHNAME,
        params: buildStrengthTodayHrDetailRouteParams({
          day,
          fallbackZoneMinutes: strengthTodaySessionZoneMinutesFallback,
          fallbackAverageHeartRateBpm: strengthTodaySessionAvgHrFallback,
        }),
      });
    },
    [router, strengthTodaySessionZoneMinutesFallback, strengthTodaySessionAvgHrFallback],
  );
  const handlePressCardioTodayAvgHeartRate = useCallback(
    (day: DayKey) => {
      router.push({
        pathname: CARDIO_TODAY_HR_DETAIL_PATHNAME,
        params: buildCardioTodayHrDetailRouteParams({
          day,
          fallbackZoneMinutes: cardioTodaySessionZoneMinutesFallback,
        }),
      });
    },
    [router, cardioTodaySessionZoneMinutesFallback],
  );

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

  /**
   * Yearly Strength card derivations. The hook below is gated: only the **prior-year** path
   * fires a network request. Current-year is aggregated in-memory from the already-hydrated
   * `domainSharedDays` slice (which already spans the full configured analytics year). Cardio
   * does not participate — none of these memos do work outside the strength domain.
   */
  const currentStrengthYear = useMemo(
    () => Number.parseInt(today.slice(0, 4), 10),
    [today],
  );
  const strengthYearNav = useMemo(
    () =>
      computeActivityYearNavigationState({
        todayDayKey: today,
        selectedYear: selectedStrengthYear,
      }),
    [today, selectedStrengthYear],
  );
  const handlePressStrengthPreviousYear = useCallback(() => {
    setSelectedStrengthYear(strengthYearNav.previousYear);
  }, [strengthYearNav.previousYear]);
  const handlePressStrengthNextYear = useCallback(() => {
    if (strengthYearNav.nextYear != null) {
      setSelectedStrengthYear(strengthYearNav.nextYear);
    }
  }, [strengthYearNav.nextYear]);
  const strengthPriorYearFetchYear = useMemo<number | null>(() => {
    if (domain !== "strength") return null;
    if (strengthYearNav.year >= currentStrengthYear) return null;
    return strengthYearNav.year;
  }, [domain, strengthYearNav.year, currentStrengthYear]);
  const strengthPriorYearMonthSummaries = useStrengthYearlyMonthSummaries(
    strengthPriorYearFetchYear,
  );
  const strengthYearlyCurrentYearMonthlyCounts = useMemo(() => {
    if (domain !== "strength") return {};
    if (overviewSharedRange.status !== "ready") return {};
    return countStrengthSessionsByMonthFromCalendarDays(domainSharedDays, currentStrengthYear);
  }, [domain, overviewSharedRange.status, domainSharedDays, currentStrengthYear]);
  const strengthYearlySelectedYearMonthlyCounts = useMemo(() => {
    if (strengthYearNav.year === currentStrengthYear) {
      return strengthYearlyCurrentYearMonthlyCounts;
    }
    return mapWorkoutMonthSummariesToStrengthMonthlyCounts(
      strengthPriorYearMonthSummaries.items,
    );
  }, [
    strengthYearNav.year,
    currentStrengthYear,
    strengthYearlyCurrentYearMonthlyCounts,
    strengthPriorYearMonthSummaries.items,
  ]);
  const strengthYearlyCardModel = useMemo(() => {
    if (domain !== "strength") return null;
    if (overviewSharedRange.status !== "ready") return null;
    return buildStrengthYearlyCardModel({
      selectedYear: strengthYearNav.year,
      todayDayKey: today,
      monthlyCounts: strengthYearlySelectedYearMonthlyCounts,
    });
  }, [
    domain,
    overviewSharedRange.status,
    strengthYearNav.year,
    today,
    strengthYearlySelectedYearMonthlyCounts,
  ]);
  /**
   * Visibility gate — matches Activity: only mount the yearly card once the **current** year has
   * at least one completed strength workout. This prevents an empty zero-bar card from appearing
   * for brand-new users. Once mounted, the card itself handles prior-year empty states.
   */
  const strengthYearlyCurrentYearModel = useMemo(() => {
    if (domain !== "strength") return null;
    if (overviewSharedRange.status !== "ready") return null;
    if (strengthYearNav.year === currentStrengthYear) return strengthYearlyCardModel;
    return buildStrengthYearlyCardModel({
      selectedYear: currentStrengthYear,
      todayDayKey: today,
      monthlyCounts: strengthYearlyCurrentYearMonthlyCounts,
    });
  }, [
    domain,
    overviewSharedRange.status,
    strengthYearNav.year,
    currentStrengthYear,
    strengthYearlyCardModel,
    today,
    strengthYearlyCurrentYearMonthlyCounts,
  ]);
  const strengthYearlyCardVisible =
    domain === "strength" && (strengthYearlyCurrentYearModel?.hasData ?? false);
  const strengthYearlyCardLoading =
    strengthYearNav.year !== currentStrengthYear &&
    strengthPriorYearMonthSummaries.status === "partial";

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

  /**
   * Cardio This Week navigator state. Mirrors {@link strengthWeekNav}: drives the navigator UX
   * + the list slice. The Weekly Distance and Weekly Duration cards each own their own week
   * anchors so a user can drill independently without nudging the This Week list.
   */
  const cardioThisWeekNav = useMemo(
    () =>
      computeEnergyWeekNavigationState({
        todayDayKey: today,
        weekAnchorDay: selectedCardioWeekAnchorDay,
      }),
    [today, selectedCardioWeekAnchorDay],
  );
  const handlePressCardioPreviousWeek = useCallback(() => {
    setSelectedCardioWeekAnchorDay(cardioThisWeekNav.previousWeekAnchor);
  }, [cardioThisWeekNav.previousWeekAnchor]);
  const handlePressCardioNextWeek = useCallback(() => {
    if (cardioThisWeekNav.nextWeekAnchor != null) {
      setSelectedCardioWeekAnchorDay(cardioThisWeekNav.nextWeekAnchor);
    }
  }, [cardioThisWeekNav.nextWeekAnchor]);
  const cardioNavWeekDaysSlice = useMemo(
    () =>
      filterWorkoutCalendarDaysInclusive(
        domainSharedDays,
        cardioThisWeekNav.weekStart,
        cardioThisWeekNav.weekEnd,
      ),
    [domainSharedDays, cardioThisWeekNav.weekStart, cardioThisWeekNav.weekEnd],
  );
  const cardioWeekSessionsNewestFirst = useMemo(() => {
    if (overviewSharedRange.status !== "ready" || domain !== "cardio") return [];
    return getCardioOverviewTabSessionsForCalendarDaysNewestFirst(cardioNavWeekDaysSlice);
  }, [overviewSharedRange.status, domain, cardioNavWeekDaysSlice]);

  const cardioThisWeekSessions = useMemo(
    () => getThisWeekCardioSessions(cardioWeekSessionsNewestFirst, cardioThisWeekNav.weekDayKeys),
    [cardioWeekSessionsNewestFirst, cardioThisWeekNav.weekDayKeys],
  );

  const cardioThisWeekSessionRows = useMemo((): CardioThisWeekSessionRow[] => {
    if (domain !== "cardio") return [];
    return cardioThisWeekSessions.map(({ day, session }) => {
      const surface = buildWorkoutSessionSurfaceModel(
        session,
        overridesByWorkoutId,
        "cardio",
        null,
        durableTitlesByWorkoutId,
      );
      const sessionOverride = pickWorkoutOverrideForSession(session, overridesByWorkoutId);
      const resolved = resolveWorkoutDisplay(
        surface.metricsWorkout,
        sessionOverride ?? overridesByWorkoutId[surface.metricsWorkout.id] ?? null,
      );
      const minutes = resolveWorkoutDisplayDurationMinutes({
        overrideDurationMinutes: resolved.displayDurationMinutes,
        sessionDurationMinutes: null,
        fallbackWorkoutDurationMinutes:
          surface.metricsWorkout.durationMinutes ?? session.durationMinutes,
      });
      const modality = resolveCardioSessionDisplayName(
        session,
        overridesByWorkoutId,
        durableTitlesByWorkoutId,
      );
      const headline = formatCardioSessionHeadline({
        distanceMeters: cardioSessionDistanceMeters(session),
        durationMinutes: minutes,
      });
      return {
        dayKey: day,
        sessionId: session.id,
        displayTitle: modality,
        metadataLine: headline,
        rowAccessibilityLabel: `Open cardio session details ${surface.actionWorkout.id}`,
        menuAccessibilityLabel: `Cardio session actions ${surface.actionWorkout.id}`,
      };
    });
  }, [domain, cardioThisWeekSessions, overridesByWorkoutId, durableTitlesByWorkoutId]);

  /** Cardio Today metric-row VM — uses canonical Daily Energy fields + reconciled sessions. */
  const cardioTodayDetailVm = useMemo(() => {
    if (domain !== "cardio") return null;
    if (overviewSharedRange.status !== "ready") return null;
    const todayRow = domainSharedDays.find((d) => d.day === today);
    const sessions = todayRow
      ? reconcileWorkoutSessionsForDay(todayRow.day, todayRow.workouts)
      : [];
    const todayCardioSessions = listTodayCardioSessionsForDetailVm(sessions);
    return buildCardioTodayDetailVm({
      todayDayKey: today,
      cardModel: cardioTodayCardModel,
      todayCardioSessions,
      overridesByWorkoutId,
      durableTitlesByWorkoutId,
      energy: dailyEnergyCardForToday.energy,
    });
  }, [
    domain,
    overviewSharedRange.status,
    domainSharedDays,
    today,
    cardioTodayCardModel,
    overridesByWorkoutId,
    durableTitlesByWorkoutId,
    dailyEnergyCardForToday.energy,
  ]);

  /** Weekly Distance / Duration cards — navigators + memoized models. */
  const cardioDistanceWeekNav = useMemo(
    () =>
      computeEnergyWeekNavigationState({
        todayDayKey: today,
        weekAnchorDay: selectedCardioDistanceWeekAnchorDay,
      }),
    [today, selectedCardioDistanceWeekAnchorDay],
  );
  const handlePressCardioDistancePreviousWeek = useCallback(() => {
    setSelectedCardioDistanceWeekAnchorDay(cardioDistanceWeekNav.previousWeekAnchor);
  }, [cardioDistanceWeekNav.previousWeekAnchor]);
  const handlePressCardioDistanceNextWeek = useCallback(() => {
    if (cardioDistanceWeekNav.nextWeekAnchor != null) {
      setSelectedCardioDistanceWeekAnchorDay(cardioDistanceWeekNav.nextWeekAnchor);
    }
  }, [cardioDistanceWeekNav.nextWeekAnchor]);
  const cardioDurationWeekNav = useMemo(
    () =>
      computeEnergyWeekNavigationState({
        todayDayKey: today,
        weekAnchorDay: selectedCardioDurationWeekAnchorDay,
      }),
    [today, selectedCardioDurationWeekAnchorDay],
  );
  const handlePressCardioDurationPreviousWeek = useCallback(() => {
    setSelectedCardioDurationWeekAnchorDay(cardioDurationWeekNav.previousWeekAnchor);
  }, [cardioDurationWeekNav.previousWeekAnchor]);
  const handlePressCardioDurationNextWeek = useCallback(() => {
    if (cardioDurationWeekNav.nextWeekAnchor != null) {
      setSelectedCardioDurationWeekAnchorDay(cardioDurationWeekNav.nextWeekAnchor);
    }
  }, [cardioDurationWeekNav.nextWeekAnchor]);
  const cardioWeeklyDistanceModel = useMemo(() => {
    if (domain !== "cardio") return null;
    if (overviewSharedRange.status !== "ready") return null;
    return buildCardioWeeklyDistanceCardModel({
      todayDayKey: today,
      weekDayKeys: cardioDistanceWeekNav.weekDayKeys,
      cardioCalendarDays: domainSharedDays,
      overridesByWorkoutId,
      durableTitlesByWorkoutId,
    });
  }, [
    domain,
    overviewSharedRange.status,
    today,
    cardioDistanceWeekNav.weekDayKeys,
    domainSharedDays,
    overridesByWorkoutId,
    durableTitlesByWorkoutId,
  ]);
  const cardioWeeklyDurationModel = useMemo(() => {
    if (domain !== "cardio") return null;
    if (overviewSharedRange.status !== "ready") return null;
    return buildCardioWeeklyDurationCardModel({
      todayDayKey: today,
      weekDayKeys: cardioDurationWeekNav.weekDayKeys,
      cardioCalendarDays: domainSharedDays,
      overridesByWorkoutId,
      durableTitlesByWorkoutId,
    });
  }, [
    domain,
    overviewSharedRange.status,
    today,
    cardioDurationWeekNav.weekDayKeys,
    domainSharedDays,
    overridesByWorkoutId,
    durableTitlesByWorkoutId,
  ]);

  /**
   * Yearly Cardio — current year aggregated in-memory from the hydrated overview slice; prior
   * years render the clean placeholder branch (no backend monthly mileage rollup yet).
   */
  const currentCardioYear = useMemo(
    () => Number.parseInt(today.slice(0, 4), 10),
    [today],
  );
  const cardioYearNav = useMemo(
    () =>
      computeActivityYearNavigationState({
        todayDayKey: today,
        selectedYear: selectedCardioYear,
      }),
    [today, selectedCardioYear],
  );
  const handlePressCardioPreviousYear = useCallback(() => {
    setSelectedCardioYear(cardioYearNav.previousYear);
  }, [cardioYearNav.previousYear]);
  const handlePressCardioNextYear = useCallback(() => {
    if (cardioYearNav.nextYear != null) {
      setSelectedCardioYear(cardioYearNav.nextYear);
    }
  }, [cardioYearNav.nextYear]);
  const cardioYearlyCurrentYearMonthlyMiles = useMemo(() => {
    if (domain !== "cardio") return {};
    if (overviewSharedRange.status !== "ready") return {};
    return sumCardioMilesByMonthFromCalendarDays(domainSharedDays, currentCardioYear, today);
  }, [domain, overviewSharedRange.status, domainSharedDays, currentCardioYear, today]);
  const cardioYearlyCardModel = useMemo(() => {
    if (domain !== "cardio") return null;
    if (overviewSharedRange.status !== "ready") return null;
    const monthlyMiles =
      cardioYearNav.year === currentCardioYear ? cardioYearlyCurrentYearMonthlyMiles : {};
    return buildCardioYearlyCardModel({
      selectedYear: cardioYearNav.year,
      todayDayKey: today,
      monthlyMiles,
    });
  }, [
    domain,
    overviewSharedRange.status,
    cardioYearNav.year,
    currentCardioYear,
    cardioYearlyCurrentYearMonthlyMiles,
    today,
  ]);
  const cardioYearlyCurrentYearModel = useMemo(() => {
    if (domain !== "cardio") return null;
    if (overviewSharedRange.status !== "ready") return null;
    if (cardioYearNav.year === currentCardioYear) return cardioYearlyCardModel;
    return buildCardioYearlyCardModel({
      selectedYear: currentCardioYear,
      todayDayKey: today,
      monthlyMiles: cardioYearlyCurrentYearMonthlyMiles,
    });
  }, [
    domain,
    overviewSharedRange.status,
    cardioYearNav.year,
    currentCardioYear,
    cardioYearlyCardModel,
    today,
    cardioYearlyCurrentYearMonthlyMiles,
  ]);
  const cardioYearlyCardVisible =
    domain === "cardio" && (cardioYearlyCurrentYearModel?.hasData ?? false);

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

  /**
   * Displayed muscle-group volume rows for the {@link WeeklyWorkingVolumeCard}. Sourced from the
   * pure {@link buildWeeklyWorkingSetVolumeRows} selector over the **navigated** volume week
   * (driven by {@link strengthVolumeWeekNav}). Default mount uses the current calendar week so
   * existing fixtures/UX are unchanged; navigating via the card chevrons re-derives this list
   * for the prior/next week. No new hydration — the journal cache is week-agnostic.
   */
  const weeklyWorkingVolumeRows = useMemo(() => {
    if (domain !== "strength") return [];
    return buildWeeklyWorkingSetVolumeRows(manualWorkoutSummaries, {
      weekStartDay: strengthVolumeWeekNav.weekStart,
      weekEndDay: strengthVolumeWeekNav.weekEnd,
      analyticsCtx: strengthAnalyticsContext,
    });
  }, [
    domain,
    manualWorkoutSummaries,
    strengthVolumeWeekNav.weekStart,
    strengthVolumeWeekNav.weekEnd,
    strengthAnalyticsContext,
  ]);

  const weeklyWorkingVolumeExercisesByMuscleGroup = useMemo(() => {
    if (domain !== "strength" || weeklyWorkingVolumeRows.length === 0) return {};
    return buildWeeklyWorkingSetExerciseRowsByMuscle(manualWorkoutSummaries, {
      weekStartDay: strengthVolumeWeekNav.weekStart,
      weekEndDay: strengthVolumeWeekNav.weekEnd,
      analyticsCtx: strengthAnalyticsContext,
    });
  }, [
    domain,
    weeklyWorkingVolumeRows.length,
    manualWorkoutSummaries,
    strengthVolumeWeekNav.weekStart,
    strengthVolumeWeekNav.weekEnd,
    strengthAnalyticsContext,
  ]);

  /**
   * Visibility sentinel for the {@link WeeklyWorkingVolumeCard} — uses **only** the current
   * calendar week so navigating to an empty prior week never unmounts the card. Once mounted,
   * the card itself renders a polished empty-state placeholder for empty navigated weeks.
   */
  const weeklyWorkingVolumeCurrentWeekHasRows = useMemo(() => {
    if (domain !== "strength") return false;
    return (
      buildWeeklyWorkingSetVolumeRows(manualWorkoutSummaries, {
        weekStartDay: weekStart,
        weekEndDay: weekEnd,
        analyticsCtx: strengthAnalyticsContext,
      }).length > 0
    );
  }, [domain, manualWorkoutSummaries, weekStart, weekEnd, strengthAnalyticsContext]);

  const weeklyHypertrophyStimulusCardModel = useMemo(() => {
    if (domain !== "strength") return null;
    return buildWeeklyHypertrophyStimulusCardModelFromJournal({
      summaries: manualWorkoutSummaries,
      weekStartDay: strengthWeekNav.weekStart,
      weekEndDay: strengthWeekNav.weekEnd,
    });
  }, [
    domain,
    manualWorkoutSummaries,
    strengthWeekNav.weekStart,
    strengthWeekNav.weekEnd,
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
                onLogPress: () => router.push("/(app)/workouts/list"),
                logAccessibilityLabel: "Open strength log" as const,
              }
            : domain === "cardio"
              ? {
                  onLogPress: () => router.push("/(app)/cardio/list"),
                  logAccessibilityLabel: "Open cardio log" as const,
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

  const scheduleRecentWorkoutRepair = useCallback(
    (reason: RecentWorkoutRepairReason, uid: string, token: string) => {
      if (Platform.OS !== "ios") return;
      if (recentWorkoutRepairInFlightRef.current) return;
      recentWorkoutRepairInFlightRef.current = true;
      runAfterInteractionsSafe(() => {
        void (async () => {
          try {
            const result = await runRecentWorkoutRepair(
              { uid, token, reason },
              {
                pullWorkoutsByDateRange,
                ingestRawEvent: (body, t, opts) =>
                  ingestRawEvent(body, t, opts).then((r) =>
                    r.ok
                      ? { ok: true as const }
                      : { ok: false as const, error: r.error, requestId: r.requestId },
                  ),
                getDeviceTimezone,
                getTodayDayKeyLocal,
                getLocalCalendarDayBoundsFromYmd,
                addLocalCalendarDaysToDayKey,
                workoutIdempotencyKey,
                enrichWorkoutPhysiology: (w, ctx) =>
                  runAppleHealthWorkoutPhysiologyEnrichment(w, {
                    neighbors: ctx.neighbors,
                    ...(uid ? { userId: uid } : {}),
                  }),
                // Tolerate undefined storage helpers in jest module mocks that predate
                // this throttle (existing overview tests mock the storage module without
                // these two symbols). Production always supplies the real fns.
                getLastRunAt: (u) =>
                  typeof getAppleHealthWorkoutsRecentRepairLastRunAt === "function"
                    ? getAppleHealthWorkoutsRecentRepairLastRunAt(u)
                    : Promise.resolve(null),
                setLastRunAtOnSuccess: (u, iso) =>
                  typeof setAppleHealthWorkoutsRecentRepairLastRunAt === "function"
                    ? setAppleHealthWorkoutsRecentRepairLastRunAt(u, iso)
                    : Promise.resolve(),
              },
            );
            if (__DEV__ && !process.env.JEST_WORKER_ID) {
              // eslint-disable-next-line no-console
              console.log("[WORKOUT_RECENT_REPAIR]", {
                status: result.status,
                reason: result.reason,
                startDay: result.startDay,
                endDay: result.endDay,
                daysRequested: result.daysRequested,
                hkWorkoutCount: result.hkWorkoutCount,
                ingestedCount: result.ingestedCount,
                failedCount: result.failedCount,
                durationMs: result.durationMs,
                ...(result.skippedReason ? { skippedReason: result.skippedReason } : {}),
                ...(result.latestNativeWorkoutStart != null
                  ? { latestNativeWorkoutStart: result.latestNativeWorkoutStart }
                  : {}),
                ...(result.firstIngestError != null
                  ? { firstIngestError: result.firstIngestError }
                  : {}),
              });
            }
            if (result.status === "ran" && result.ingestedCount > 0) {
              setWorkoutsCalendarRefreshEpoch((n) => n + 1);
            }
          } catch (e) {
            if (__DEV__ && !process.env.JEST_WORKER_ID) {
              // eslint-disable-next-line no-console
              console.warn("[WORKOUT_RECENT_REPAIR] threw; swallowed", e);
            }
          } finally {
            recentWorkoutRepairInFlightRef.current = false;
          }
        })();
      });
    },
    [],
  );

  const maybeAutoAppleSync = useCallback(
    async (reason: "focus" | "foreground") => {
      void reason; // reserved for future idempotency / logging
      if (connectionStatus !== "connected" || !user) return;
      const token = await getIdToken(false);
      if (!token) return;

      // Workout Recent Repair — fire-and-forget rolling 14-day re-pull. Runs
      // INDEPENDENTLY of the anchored-sync throttle (which would otherwise skip
      // this focus when `lastCheckedAt` is fresh). The helper has its own per-uid
      // throttle and an in-flight ref so repeated focuses don't stack. Closes
      // the gap where anchored deltas silently miss a Watch-recorded workout.
      void scheduleRecentWorkoutRepair(reason, user.uid, token);

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
            getStepCountForDateRange,
            // Workout Physiology v1 — Phase A diagnostics (dev/staging only).
            // Read-only HK probe + structured log; gated internally on
            // shouldLogAppleHealthPhysiologyDiagnostics(). Never mutates raw
            // payloads or canonical state.
            diagnoseWorkoutPhysiology: runAppleHealthWorkoutPhysiologyDiagnostic,
            // Workout Physiology v1 — Phase B enrichment (default ENABLED via
            // AH_WORKOUT_PHYSIOLOGY_V1). Produces avg/max HR (padded), zones,
            // energy, recovery; never throws.
            enrichWorkoutPhysiology: (w, ctx) =>
              runAppleHealthWorkoutPhysiologyEnrichment(w, {
                neighbors: ctx.neighbors,
                ...(user?.uid ? { userId: user.uid } : {}),
              }),
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
    [connectionStatus, user, getIdToken, scheduleRecentWorkoutRepair],
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
        weekRangeLabel={strengthWeekNav.weekRangeLabel}
        canGoPrevious={strengthWeekNav.canGoPrevious}
        canGoNext={strengthWeekNav.canGoNext}
        onPressPrevious={handlePressStrengthPreviousWeek}
        onPressNext={handlePressStrengthNextWeek}
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
      <CardioThisWeekCard
        loading={overviewSharedRange.status !== "ready"}
        emptyMessage="No cardio sessions this week yet"
        sessions={cardioThisWeekSessionRows}
        weekRangeLabel={cardioThisWeekNav.weekRangeLabel}
        canGoPrevious={cardioThisWeekNav.canGoPrevious}
        canGoNext={cardioThisWeekNav.canGoNext}
        onPressPrevious={handlePressCardioPreviousWeek}
        onPressNext={handlePressCardioNextWeek}
        onPressSession={(day) => {
          router.push({ pathname: "/(app)/cardio/day/[day]", params: { day } });
        }}
        onPressSessionMenu={(day, sessionId, event) => {
          const hit = cardioThisWeekSessions.find(
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

  const content = (
    <View style={styles.pageBody}>
      {domain === "strength" ? (
        <>
          <StrengthTodayCard
            loading={overviewSharedRange.status !== "ready"}
            detailVm={strengthTodayDetailVm}
            onPressLog={() => router.push(`${basePath}/log`)}
            onPressAvgHeartRate={handlePressStrengthTodayAvgHeartRate}
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
          {weeklyHypertrophyStimulusCardModel != null ? (
            <WeeklyHypertrophyStimulusCard
              model={weeklyHypertrophyStimulusCardModel}
              onPress={() =>
                router.push({
                  pathname: "/(app)/workouts/muscle-stimulus",
                  params: { weekStart: strengthWeekNav.weekStart },
                })
              }
            />
          ) : null}
          {weeklyWorkingVolumeCurrentWeekHasRows ? (
            <WeeklyWorkingVolumeCard
              rows={weeklyWorkingVolumeRows}
              exercisesByMuscleGroup={weeklyWorkingVolumeExercisesByMuscleGroup}
              weekRangeLabel={strengthVolumeWeekNav.weekRangeLabel}
              canGoPrevious={strengthVolumeWeekNav.canGoPrevious}
              canGoNext={strengthVolumeWeekNav.canGoNext}
              onPressPrevious={handlePressStrengthVolumePreviousWeek}
              onPressNext={handlePressStrengthVolumeNextWeek}
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
            />
          ) : null}
          {strengthYearlyCardVisible ? (
            <StrengthYearlyCard
              loading={strengthYearlyCardLoading}
              model={strengthYearlyCardModel}
              canGoPrevious={strengthYearNav.canGoPrevious}
              canGoNext={strengthYearNav.canGoNext}
              onPressPrevious={handlePressStrengthPreviousYear}
              onPressNext={handlePressStrengthNextYear}
            />
          ) : null}
        </>
      ) : (
        <>
          <CardioTodayCard
            loading={overviewSharedRange.status !== "ready"}
            detailVm={cardioTodayDetailVm}
            onPressLog={() => router.push(`${basePath}/log`)}
            onPressAvgHeartRate={handlePressCardioTodayAvgHeartRate}
          />
          {cardioThisWeekCard}
          <CardioWeeklyMetricCard
            title="Weekly Distance"
            loading={overviewSharedRange.status !== "ready"}
            model={cardioWeeklyDistanceModel}
            unit="mi"
            weekRangeLabel={cardioDistanceWeekNav.weekRangeLabel}
            canGoPrevious={cardioDistanceWeekNav.canGoPrevious}
            canGoNext={cardioDistanceWeekNav.canGoNext}
            onPressPrevious={handlePressCardioDistancePreviousWeek}
            onPressNext={handlePressCardioDistanceNextWeek}
            todayDayKey={today}
            formatBarLabel={formatCardioWeeklyDistanceBarLabel}
            emptyPlaceholder="No cardio distance this week yet"
            testIDRoot="cardio-weekly-distance"
          />
          <CardioWeeklyMetricCard
            title="Weekly Duration"
            loading={overviewSharedRange.status !== "ready"}
            model={cardioWeeklyDurationModel}
            unit="min"
            weekRangeLabel={cardioDurationWeekNav.weekRangeLabel}
            canGoPrevious={cardioDurationWeekNav.canGoPrevious}
            canGoNext={cardioDurationWeekNav.canGoNext}
            onPressPrevious={handlePressCardioDurationPreviousWeek}
            onPressNext={handlePressCardioDurationNextWeek}
            todayDayKey={today}
            formatBarLabel={formatCardioWeeklyDurationBarLabel}
            emptyPlaceholder="No cardio time this week yet"
            testIDRoot="cardio-weekly-duration"
          />
          {cardioHistorySummaryModel ? (
            <CardioHistorySummaryCard
              model={cardioHistorySummaryModel}
              onPressViewMore={() => router.push(`${basePath}/analytics-detail`)}
            />
          ) : null}
          {cardioYearlyCardVisible ? (
            <CardioYearlyCard
              loading={false}
              model={cardioYearlyCardModel}
              canGoPrevious={cardioYearNav.canGoPrevious}
              canGoNext={cardioYearNav.canGoNext}
              onPressPrevious={handlePressCardioPreviousYear}
              onPressNext={handlePressCardioNextYear}
              priorYearPlaceholder="Yearly cardio history is coming soon"
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