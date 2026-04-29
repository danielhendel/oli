import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { RecentWorkoutSessionEntry } from "@/lib/data/workouts/workoutsCalendarModel";
import { displayLabelForAppleHealthKitWorkoutActivityType } from "@/lib/data/workouts/appleHealthKitWorkoutActivityType";
import { formatWorkoutDurationLabel, formatWorkoutTitle } from "@/lib/data/workouts/workoutDisplay";
import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import type { DayKey } from "@/lib/ui/calendar/types";

const METERS_PER_MILE = 1609.344;
const CARDIO_MILES_WEEK_SCALE_MAX = 25;

export type CardioDistanceTier = "very_low" | "low" | "active" | "high" | "very_high";

export function cardioDistanceTierFromWeeklyMiles(weeklyMiles: number): CardioDistanceTier {
  if (weeklyMiles <= 2.4) return "very_low";
  if (weeklyMiles <= 7.4) return "low";
  if (weeklyMiles <= 14.9) return "active";
  if (weeklyMiles <= 24.9) return "high";
  return "very_high";
}

export function cardioDistanceTierLabel(tier: CardioDistanceTier): string {
  if (tier === "very_low") return "Very Low";
  if (tier === "very_high") return "Very High";
  if (tier === "low") return "Low";
  if (tier === "active") return "Active";
  return "High";
}

export function cardioDistanceTierIndexForBar(tier: CardioDistanceTier): number {
  if (tier === "very_low") return 0;
  if (tier === "low") return 1;
  if (tier === "active") return 2;
  if (tier === "high") return 3;
  return 4;
}

export function cardioWeeklyMilesScaleFill01(weeklyMiles: number): number {
  if (!Number.isFinite(weeklyMiles)) return 0;
  return Math.min(1, Math.max(0, weeklyMiles / CARDIO_MILES_WEEK_SCALE_MAX));
}

export function cardioSessionDistanceMeters(session: ReconciledWorkoutSession): number | null {
  let total = 0;
  let hasValue = false;
  for (const workout of session.workouts) {
    if (
      typeof workout.distanceMeters === "number" &&
      Number.isFinite(workout.distanceMeters) &&
      workout.distanceMeters > 0
    ) {
      total += workout.distanceMeters;
      hasValue = true;
    }
  }
  return hasValue ? total : null;
}

export function cardioSessionDistanceMiles(session: ReconciledWorkoutSession): number | null {
  const meters = cardioSessionDistanceMeters(session);
  if (meters == null) return null;
  return meters / METERS_PER_MILE;
}

export function formatCardioSessionHeadline(input: {
  distanceMeters?: number | null;
  durationMinutes?: number | null;
}): string {
  const parts: string[] = [];
  if (
    typeof input.distanceMeters === "number" &&
    Number.isFinite(input.distanceMeters) &&
    input.distanceMeters > 0
  ) {
    parts.push(`${(input.distanceMeters / METERS_PER_MILE).toFixed(2)} mi`);
  }
  const duration = formatWorkoutDurationLabel(input.durationMinutes ?? null);
  if (duration !== "—") {
    parts.push(duration);
  }
  if (parts.length === 0) return "—";
  return parts.join(" / ");
}

function stringLabelScore(label: string): number {
  const n = label.trim().toLowerCase();
  if (n.length === 0 || n === "workout" || n === "cardio") return 0;
  if (n === "other" || n === "unknown" || n === "uncategorized") return 2;
  return 40;
}

function workoutSubtitleCandidates(workout: WorkoutHistoryItem): { label: string; score: number }[] {
  const out: { label: string; score: number }[] = [];
  const hkLabel = displayLabelForAppleHealthKitWorkoutActivityType(workout.hk?.activityId ?? null);
  if (hkLabel) {
    out.push({ label: hkLabel, score: 120 });
  }
  const raw = workout.activityName ?? workout.sport ?? workout.title;
  const fromStrings = formatWorkoutTitle(raw);
  if (fromStrings !== "Workout") {
    let score = stringLabelScore(fromStrings);
    if (typeof workout.distanceMeters === "number" && workout.distanceMeters > 0) score += 25;
    out.push({ label: fromStrings, score });
  }
  return out;
}

/**
 * Picks the best modality label across merged raw rows (e.g. duplicate HK samples): prefers
 * {@link displayLabelForAppleHealthKitWorkoutActivityType}, then non-generic strings, favoring rows with distance.
 */
function pickSessionTypeLikeLabel(session: ReconciledWorkoutSession): string {
  let best = "";
  let bestScore = -1;
  for (const workout of session.workouts) {
    for (const { label, score } of workoutSubtitleCandidates(workout)) {
      if (score > bestScore) {
        bestScore = score;
        best = label;
      }
    }
  }
  if (bestScore >= 0 && best.length > 0) return best;
  const fallback = formatWorkoutTitle(session.title);
  return fallback === "Workout" ? "Cardio" : fallback;
}

export function formatCardioSessionSubtitle(session: ReconciledWorkoutSession): string {
  return pickSessionTypeLikeLabel(session);
}

function isUnsupportedCardioModalityLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  if (normalized.length === 0) return true;
  return (
    normalized === "other" ||
    normalized === "unknown" ||
    normalized === "uncategorized" ||
    normalized === "workout" ||
    normalized === "cardio"
  );
}

export function isSupportedCardioModalityLabel(label: string): boolean {
  return !isUnsupportedCardioModalityLabel(label);
}

export function isSupportedCardioSessionModality(session: ReconciledWorkoutSession): boolean {
  return isSupportedCardioModalityLabel(formatCardioSessionSubtitle(session));
}

/**
 * Full History / week lists: drops generic Apple “Other” rows with no distance (duration-only noise).
 * Named modalities (Walking, Running, …) stay visible even when distance is missing.
 */
export function isDisplayableCardioHistorySession(session: ReconciledWorkoutSession): boolean {
  if (session.sessionType !== "cardio") return false;
  const subtitle = formatCardioSessionSubtitle(session).trim().toLowerCase();
  const miles = cardioSessionDistanceMiles(session);
  const hasDistance = miles != null && miles > 0;

  if (subtitle === "other" || subtitle === "unknown" || subtitle === "uncategorized") {
    return hasDistance;
  }
  return true;
}

/** Weekly mileage banner: sum distances for every displayable cardio session in the slice (not only the 3 visible rows). */
export function sumDisplayableCardioDistanceMilesForWeekEntries(
  sessions: readonly RecentWorkoutSessionEntry[],
): number {
  let sum = 0;
  for (const entry of sessions) {
    if (entry.session.sessionType !== "cardio") continue;
    if (!isDisplayableCardioHistorySession(entry.session)) continue;
    const miles = cardioSessionDistanceMiles(entry.session);
    if (miles != null && Number.isFinite(miles)) sum += Math.max(0, miles);
  }
  return sum;
}

function parseSessionInstantMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

/**
 * Whether two reconciled sessions overlap in time on the calendar (same-day duplicate detection).
 */
export function sessionsHaveOverlappingTimeWindows(a: ReconciledWorkoutSession, b: ReconciledWorkoutSession): boolean {
  const aStart =
    parseSessionInstantMs(a.start) ??
    parseSessionInstantMs(a.workouts[0]?.start ?? a.workouts[0]?.observedAt ?? null);
  const bStart =
    parseSessionInstantMs(b.start) ??
    parseSessionInstantMs(b.workouts[0]?.start ?? b.workouts[0]?.observedAt ?? null);
  if (aStart == null || bStart == null) return false;

  const aEnd =
    parseSessionInstantMs(a.end) ??
    (typeof a.durationMinutes === "number" && a.durationMinutes > 0
      ? aStart + Math.round(a.durationMinutes * 60_000)
      : aStart);
  const bEnd =
    parseSessionInstantMs(b.end) ??
    (typeof b.durationMinutes === "number" && b.durationMinutes > 0
      ? bStart + Math.round(b.durationMinutes * 60_000)
      : bStart);

  const al = Math.min(aStart, aEnd);
  const ar = Math.max(aStart, aEnd);
  const bl = Math.min(bStart, bEnd);
  const br = Math.max(bStart, bEnd);
  return al <= br && ar >= bl;
}

/**
 * Drops duration-only “Other” sessions that overlap a distance-bearing, well-modality cardio session the same day
 * (companion duplicate from Apple Health).
 */
export function filterCardioHistoryRowsDedupeOverlappingOther<
  T extends { day: DayKey; session: ReconciledWorkoutSession },
>(rows: readonly T[]): T[] {
  const byDay = new Map<DayKey, T[]>();
  for (const r of rows) {
    const arr = byDay.get(r.day) ?? [];
    arr.push(r);
    byDay.set(r.day, arr);
  }

  const dropIds = new Set<string>();
  for (const dayRows of byDay.values()) {
    for (const r of dayRows) {
      const s = r.session;
      const sub = formatCardioSessionSubtitle(s).trim().toLowerCase();
      const hasDist = (cardioSessionDistanceMiles(s) ?? 0) > 0;
      if (sub !== "other" || hasDist) continue;

      for (const other of dayRows) {
        if (other.session.id === s.id) continue;
        const o = other.session;
        const odist = (cardioSessionDistanceMiles(o) ?? 0) > 0;
        const modalityOk = odist && isSupportedCardioModalityLabel(formatCardioSessionSubtitle(o));
        if (modalityOk && sessionsHaveOverlappingTimeWindows(s, o)) {
          dropIds.add(s.id);
          break;
        }
      }
    }
  }

  return rows.filter((r) => !dropIds.has(r.session.id));
}

function sessionChronologicalSortKey(session: ReconciledWorkoutSession): string {
  return session.start ?? session.workouts[0]?.start ?? session.workouts[0]?.observedAt ?? "";
}

/**
 * Cardio “This Week”: every displayable, modality-supported cardio session in the selected week,
 * sorted **Sun → Sat** by calendar slot in `weekDaysInOrder`, then earliest start time within a day.
 */
export function getThisWeekCardioSessions(
  sessions: readonly RecentWorkoutSessionEntry[],
  weekDaysInOrder: readonly string[],
): RecentWorkoutSessionEntry[] {
  const dayOrder = new Map(weekDaysInOrder.map((day, idx) => [day, idx]));
  const filtered = sessions.filter((entry) => {
    if (entry.session.sessionType !== "cardio") return false;
    if (!dayOrder.has(entry.day)) return false;
    if (!isDisplayableCardioHistorySession(entry.session)) return false;
    return isSupportedCardioSessionModality(entry.session);
  });
  filtered.sort((a, b) => {
    const dayA = dayOrder.get(a.day) ?? Number.MAX_SAFE_INTEGER;
    const dayB = dayOrder.get(b.day) ?? Number.MAX_SAFE_INTEGER;
    if (dayA !== dayB) return dayA - dayB;
    const ka = sessionChronologicalSortKey(a.session);
    const kb = sessionChronologicalSortKey(b.session);
    const t = ka.localeCompare(kb);
    if (t !== 0) return t;
    return a.session.id.localeCompare(b.session.id);
  });
  return filtered;
}

export function formatThisWeekCardioDistanceSummary(totalMiles: number): string {
  const normalized = Number.isFinite(totalMiles) ? Math.max(0, totalMiles) : 0;
  return `${normalized.toFixed(1)} mi this week`;
}

export function formatCardioWeeklyDistanceAndMinutes(input: {
  averageMilesPerWeek?: number | null;
  averageMinutesPerWeek?: number | null;
}): string {
  const miles =
    typeof input.averageMilesPerWeek === "number" &&
    Number.isFinite(input.averageMilesPerWeek) &&
    input.averageMilesPerWeek > 0
      ? `${input.averageMilesPerWeek.toFixed(1)} mi/wk`
      : null;
  const minutes =
    typeof input.averageMinutesPerWeek === "number" &&
    Number.isFinite(input.averageMinutesPerWeek) &&
    input.averageMinutesPerWeek > 0
      ? `${Math.round(input.averageMinutesPerWeek)} min/wk`
      : null;
  if (miles && minutes) return `${miles.replace("/wk", "")} · ${minutes}`;
  if (miles) return miles;
  if (minutes) return minutes;
  return "—";
}
