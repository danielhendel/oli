/**
 * Cardio Today card — metrics-first detail view model.
 *
 * Mirrors {@link buildStrengthTodayDetailVm}: emits a large left-aligned hero (Apple Health–derived
 * cardio modality / session name) followed by an ordered list of six metric rows
 * (Duration → Distance → Avg Cadence → Avg Pace → Avg Heart Rate → Estimated Calories).
 *
 * Pure + presentation-only:
 * - No React, no Firebase, no I/O.
 * - All inputs come from selectors / hooks already used elsewhere.
 *
 * Canonical sources reused (no parallel paths, no fabricated values):
 * - `CardioTodayCardModel` → reconciled list of today's displayable cardio sessions.
 * - `cardioSessionDistanceMiles` → distance per session (sums `workout.distanceMeters`).
 * - `resolveWorkoutDisplayDurationMinutes` + `formatWorkoutDurationLabel` → duration.
 * - `resolveCardioSessionDisplayName` → centralized hero/title resolution (durable override →
 *   AsyncStorage override → modality label such as `"Outdoor Run"`, `"Walking"`).
 * - `energy.factors.cardio` (via `formatFactorDisplayAdditive`) → Estimated Calories — same
 *   formatter Daily Energy uses for its Cardio row. No parallel calorie math.
 * - `energy.energyInfluencers.cardio.averageHeartRateBpm` → Avg heart rate (duration-weighted
 *   daily rollup computed server-side by `aggregateDailyFacts.ts`).
 * - `energy.energyInfluencers.cardio.paceMinPerKm` → Avg pace, deterministically converted to
 *   min/mi (presentation-only mapping using `1 km = 0.621371192 mi`).
 *
 * Multi-session days: the hero features the **best representative cardio session** for the day
 * (see {@link pickBestRepresentativeCardioSessionForDay}) — Running family wins over Walking,
 * then highest-distance, then longest-duration, then earliest start. Hero text is resolved via
 * {@link resolveCardioSessionDisplayName} so a user rename / durable title override is visible
 * here (rename precedence: durable override → AsyncStorage override → HK modality label). Distance
 * and Duration rows are still aggregated across **all** today's qualifying cardio sessions (matches
 * how `energyInfluencers.cardio` is computed daily). A `subtitleLine` of `"+N more sessions"` is
 * surfaced when more than one cardio session exists today.
 *
 * Missing-data policy: every row renders {@link CARDIO_TODAY_DETAIL_MISSING_VALUE} (`"—"`) when
 * the underlying canonical field is missing. Cadence is **always** `"—"` until cadence is plumbed
 * end-to-end — no fake values.
 */

import type {
  DailyEnergyCardDto,
  DailyEnergyFactorDto,
} from "@/lib/data/dash/useDailyEnergyCard";
import type { CardioTodayCardModel } from "@/lib/data/workouts/cardioTodayCardModel";
import {
  cardioSessionDistanceMiles,
  isDisplayableCardioHistorySession,
  isSupportedCardioSessionModality,
  pickBestRepresentativeCardioSessionForDay,
  resolveCardioSessionDisplayName,
} from "@/lib/data/workouts/cardioSessionPresentation";
import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import {
  formatWorkoutDurationLabel,
  resolveWorkoutDisplay,
  resolveWorkoutDisplayDurationMinutes,
} from "@/lib/data/workouts/workoutDisplay";
import {
  buildWorkoutSessionSurfaceModel,
  pickWorkoutOverrideForSession,
} from "@/lib/data/workouts/workoutSessionSurface";
import type { WorkoutOverride } from "@/lib/data/workouts/workoutOverrides";
import type { DayKey } from "@/lib/ui/calendar/types";
import { formatFactorDisplayAdditive } from "@/lib/ui/energy/energyPresentation";

/** Glyph used for any unavailable metric value. Never replaced by computed estimates. */
export const CARDIO_TODAY_DETAIL_MISSING_VALUE = "\u2014" as const;

/** Ordered metric-row identifiers. Order is part of the contract — asserted by tests. */
export type CardioTodayDetailMetricRowId =
  | "duration"
  | "distance"
  | "avgCadence"
  | "avgPace"
  | "avgHeartRate"
  | "estimatedCalories";

/** Stable, design-approved labels — exported so the card / tests don't duplicate the literal. */
export const CARDIO_TODAY_DETAIL_METRIC_LABELS: Record<CardioTodayDetailMetricRowId, string> = {
  duration: "Duration",
  distance: "Distance",
  avgCadence: "Avg Cadence",
  avgPace: "Avg Pace",
  avgHeartRate: "Avg Heart Rate",
  estimatedCalories: "Estimated Calories",
};

export type CardioTodayDetailMetricRow = {
  id: CardioTodayDetailMetricRowId;
  label: string;
  /** Rendered value. `CARDIO_TODAY_DETAIL_MISSING_VALUE` when source is missing. */
  value: string;
  /**
   * Workout Physiology v1 (Phase C) — when `true`, the card renders this row as a Pressable
   * with a chevron and routes to the cardio HR detail modal. Only `avgHeartRate` is ever
   * tappable, and only when avg HR or zone data exists (no chevron for a row that would
   * open an empty modal). Mirrors the Strength VM tappable contract.
   */
  tappable?: true;
};

export type CardioTodayDetailVm =
  | {
      status: "rest";
      pill: "No Cardio";
      hero: "No cardio today";
      subtitleLine: "Log a session when you train";
    }
  | {
      status: "completed";
      pill: "Completed";
      /** Large left-aligned modality / session name (e.g. "Indoor Run"). */
      hero: string;
      /** "+N more sessions" when multi-session, else `null`. */
      subtitleLine: string | null;
      /** Ordered metric rows — exact contract order (Duration → … → Estimated Calories). */
      rows: readonly [
        CardioTodayDetailMetricRow,
        CardioTodayDetailMetricRow,
        CardioTodayDetailMetricRow,
        CardioTodayDetailMetricRow,
        CardioTodayDetailMetricRow,
        CardioTodayDetailMetricRow,
      ];
      /** Day the rows correspond to — verbatim from input. */
      energyDay: DayKey;
    };

const KM_PER_MILE = 1.609344;

function safeNumber(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Format a non-negative miles value to `"X.XX mi"`. `"—"` when missing or non-positive. */
export function formatCardioTodayDistanceValue(totalMiles: number | null | undefined): string {
  const n = safeNumber(totalMiles ?? null);
  if (n == null || n <= 0) return CARDIO_TODAY_DETAIL_MISSING_VALUE;
  return `${n.toFixed(2)} mi`;
}

/** Format an avg HR value (bpm). `"—"` when missing/invalid. */
export function formatCardioTodayAvgHeartRateValue(
  averageHeartRateBpm: number | undefined | null,
): string {
  const n = safeNumber(averageHeartRateBpm ?? null);
  if (n == null || n <= 0) return CARDIO_TODAY_DETAIL_MISSING_VALUE;
  return `${Math.round(n)} bpm`;
}

/**
 * Format pace as `mm:ss/mi` from a `paceMinPerKm` value. Presentation-only conversion:
 * `paceMinPerMi = paceMinPerKm * 1.609344`. Returns `"—"` for missing / non-finite / non-positive.
 */
export function formatCardioTodayPaceValue(paceMinPerKm: number | undefined | null): string {
  const n = safeNumber(paceMinPerKm ?? null);
  if (n == null || n <= 0) return CARDIO_TODAY_DETAIL_MISSING_VALUE;
  const paceMinPerMi = n * KM_PER_MILE;
  if (!Number.isFinite(paceMinPerMi) || paceMinPerMi <= 0) return CARDIO_TODAY_DETAIL_MISSING_VALUE;
  const totalSeconds = Math.round(paceMinPerMi * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}/mi`;
}

/** Reuse the same Daily Energy formatter the Strength Today / Daily Energy cards already use. */
export function formatCardioTodayCalorieValue(factor: DailyEnergyFactorDto | undefined): string {
  return formatFactorDisplayAdditive(factor) ?? CARDIO_TODAY_DETAIL_MISSING_VALUE;
}

function sessionChronoSortKey(session: ReconciledWorkoutSession): string {
  return session.start ?? session.workouts[0]?.start ?? session.workouts[0]?.observedAt ?? "";
}

/**
 * Today's displayable cardio sessions (same filter rules as
 * {@link buildCardioTodayCardModel}), sorted chronologically. Exported so the screen can pass
 * the same list into this VM and avoid duplicating filter logic.
 */
export function listTodayCardioSessionsForDetailVm(
  sessions: readonly ReconciledWorkoutSession[],
): ReconciledWorkoutSession[] {
  const cardio = sessions.filter(
    (s) =>
      s.sessionType === "cardio" &&
      isDisplayableCardioHistorySession(s) &&
      isSupportedCardioSessionModality(s),
  );
  return [...cardio].sort((a, b) => {
    const ka = sessionChronoSortKey(a);
    const kb = sessionChronoSortKey(b);
    const t = ka.localeCompare(kb);
    if (t !== 0) return t;
    return a.id.localeCompare(b.id);
  });
}

function sumDurationMinutesAcrossSessions(
  sessions: readonly ReconciledWorkoutSession[],
  overridesByWorkoutId: Record<string, WorkoutOverride | undefined>,
  durableTitlesByWorkoutId: Record<string, string | undefined>,
): number | null {
  let total = 0;
  let hasValue = false;
  for (const session of sessions) {
    const surface = buildWorkoutSessionSurfaceModel(
      session,
      overridesByWorkoutId,
      "cardio",
      null,
      durableTitlesByWorkoutId,
    );
    const sessionOverride = pickWorkoutOverrideForSession(session, overridesByWorkoutId);
    const resolvedMetrics = resolveWorkoutDisplay(
      surface.metricsWorkout,
      sessionOverride ?? overridesByWorkoutId[surface.metricsWorkout.id] ?? null,
    );
    const minutes = resolveWorkoutDisplayDurationMinutes({
      overrideDurationMinutes: resolvedMetrics.displayDurationMinutes,
      sessionDurationMinutes: null,
      fallbackWorkoutDurationMinutes: surface.metricsWorkout.durationMinutes ?? session.durationMinutes,
    });
    if (typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0) {
      total += minutes;
      hasValue = true;
    }
  }
  return hasValue ? total : null;
}

function sumDistanceMilesAcrossSessions(
  sessions: readonly ReconciledWorkoutSession[],
): number | null {
  let total = 0;
  let hasValue = false;
  for (const session of sessions) {
    const miles = cardioSessionDistanceMiles(session);
    if (typeof miles === "number" && Number.isFinite(miles) && miles > 0) {
      total += miles;
      hasValue = true;
    }
  }
  return hasValue ? total : null;
}

export type BuildCardioTodayDetailVmInput = {
  todayDayKey: DayKey;
  /** Output of `buildCardioTodayCardModel` for the same day (hero pill / completed-vs-rest). */
  cardModel: CardioTodayCardModel | null;
  /**
   * Today's displayable cardio sessions (chronological). Sourced upstream so this VM stays pure.
   * Use {@link listTodayCardioSessionsForDetailVm} to derive from reconciled sessions.
   */
  todayCardioSessions: readonly ReconciledWorkoutSession[];
  overridesByWorkoutId: Record<string, WorkoutOverride | undefined>;
  durableTitlesByWorkoutId: Record<string, string | undefined>;
  /** Hydrated daily energy DTO for `todayDayKey`. `undefined` while loading / on error / signed-out. */
  energy: DailyEnergyCardDto | undefined;
};

/**
 * Build the Cardio Today detail VM.
 *
 * - `rest` branch: VM mirrors `cardModel` rest copy.
 * - `completed` branch: emits the **exact 6-row** metric list in the approved order. Cadence is
 *   always `"—"` until ingestion lands. Pace converts from `paceMinPerKm` to `min:ss/mi`. HR
 *   and Calories use the same canonical fields Strength Today does.
 */
export function buildCardioTodayDetailVm(input: BuildCardioTodayDetailVmInput): CardioTodayDetailVm {
  const {
    todayDayKey,
    cardModel,
    todayCardioSessions,
    overridesByWorkoutId,
    durableTitlesByWorkoutId,
    energy,
  } = input;

  if (
    cardModel == null ||
    cardModel.kind === "rest" ||
    todayCardioSessions.length === 0
  ) {
    return {
      status: "rest",
      pill: "No Cardio",
      hero: "No cardio today",
      subtitleLine: "Log a session when you train",
    };
  }

  const primary =
    pickBestRepresentativeCardioSessionForDay(todayCardioSessions) ?? todayCardioSessions[0]!;
  const moreCount = todayCardioSessions.length - 1;
  const subtitleLine =
    moreCount > 0
      ? `+${moreCount} more session${moreCount === 1 ? "" : "s"}`
      : null;

  const hero = resolveCardioSessionDisplayName(
    primary,
    overridesByWorkoutId,
    durableTitlesByWorkoutId,
  );

  const totalMinutes = sumDurationMinutesAcrossSessions(
    todayCardioSessions,
    overridesByWorkoutId,
    durableTitlesByWorkoutId,
  );
  const totalMiles = sumDistanceMilesAcrossSessions(todayCardioSessions);

  const cardioInfluencer = energy?.energyInfluencers?.cardio;
  const cardioFactor = energy?.factors.cardio;

  // Workout Physiology v1 (Phase C) — only mark the Avg Heart Rate row tappable when
  // there is something to drill into (avg HR present, or HR zones present). Avoids a
  // chevron leading users to an empty modal. The modal itself handles the case where
  // only one of the two is present and copies the same "zones aren't available yet"
  // fallback the Strength HR modal renders.
  const hasAvgHrToInspect =
    typeof cardioInfluencer?.averageHeartRateBpm === "number" &&
    Number.isFinite(cardioInfluencer.averageHeartRateBpm) &&
    cardioInfluencer.averageHeartRateBpm > 0;
  const hasZonesToInspect =
    Array.isArray(cardioInfluencer?.heartRateZoneMinutes) &&
    cardioInfluencer.heartRateZoneMinutes.length === 5;
  const avgHrTappable = hasAvgHrToInspect || hasZonesToInspect;

  const rows: readonly [
    CardioTodayDetailMetricRow,
    CardioTodayDetailMetricRow,
    CardioTodayDetailMetricRow,
    CardioTodayDetailMetricRow,
    CardioTodayDetailMetricRow,
    CardioTodayDetailMetricRow,
  ] = [
    {
      id: "duration",
      label: CARDIO_TODAY_DETAIL_METRIC_LABELS.duration,
      value: formatWorkoutDurationLabel(totalMinutes),
    },
    {
      id: "distance",
      label: CARDIO_TODAY_DETAIL_METRIC_LABELS.distance,
      value: formatCardioTodayDistanceValue(totalMiles),
    },
    {
      id: "avgCadence",
      label: CARDIO_TODAY_DETAIL_METRIC_LABELS.avgCadence,
      value: CARDIO_TODAY_DETAIL_MISSING_VALUE,
    },
    {
      id: "avgPace",
      label: CARDIO_TODAY_DETAIL_METRIC_LABELS.avgPace,
      value: formatCardioTodayPaceValue(cardioInfluencer?.paceMinPerKm),
    },
    {
      id: "avgHeartRate",
      label: CARDIO_TODAY_DETAIL_METRIC_LABELS.avgHeartRate,
      value: formatCardioTodayAvgHeartRateValue(cardioInfluencer?.averageHeartRateBpm),
      ...(avgHrTappable ? { tappable: true as const } : {}),
    },
    {
      id: "estimatedCalories",
      label: CARDIO_TODAY_DETAIL_METRIC_LABELS.estimatedCalories,
      value: formatCardioTodayCalorieValue(cardioFactor),
    },
  ];

  return {
    status: "completed",
    pill: "Completed",
    hero,
    subtitleLine,
    rows,
    energyDay: todayDayKey,
  };
}
