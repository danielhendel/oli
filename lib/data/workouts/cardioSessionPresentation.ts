import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { RecentWorkoutSessionEntry } from "@/lib/data/workouts/workoutsCalendarModel";
import {
  displayLabelForAppleHealthKitWorkoutActivityType,
  HK_WORKOUT_ACTIVITY_TYPE_OTHER,
  hkActivityIdIsRunningFamily,
  hkActivityIdIsWalkingFamily,
} from "@/lib/data/workouts/appleHealthKitWorkoutActivityType";
import { formatWorkoutDurationLabel, formatWorkoutTitle } from "@/lib/data/workouts/workoutDisplay";
import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import type { WorkoutOverride } from "@/lib/data/workouts/workoutOverrides";
import {
  pickDurableTitleForSession,
  pickWorkoutOverrideForSession,
} from "@/lib/data/workouts/workoutSessionSurface";
import type { DayKey } from "@/lib/ui/calendar/types";
import { CARDIO_WEEKLY_MILES_DISPLAY_MAX } from "@/lib/ui/workouts/cardioBaselineScale";

const METERS_PER_MILE = 1609.344;

/** Scale end for “This Week” mileage fill — matches {@link CARDIO_WEEKLY_MILES_DISPLAY_MAX}. */
const CARDIO_MILES_WEEK_SCALE_MAX = CARDIO_WEEKLY_MILES_DISPLAY_MAX;

export type CardioDistanceTier = "very_low" | "low" | "active" | "high" | "very_high" | "peak";

/**
 * Six cardio tiers (mi/wk): Very Low → Peak (elite). Boundaries match product ladder / baseline ruler.
 * Uses half-open intervals upward at breakpoints 2.5, 7.5, 15, 25, 40.
 */
export function cardioDistanceTierFromWeeklyMiles(weeklyMiles: number): CardioDistanceTier {
  const n = Number.isFinite(weeklyMiles) ? Math.max(0, weeklyMiles) : 0;
  if (n < 2.5) return "very_low";
  if (n < 7.5) return "low";
  if (n < 15) return "active";
  if (n < 25) return "high";
  if (n < 40) return "very_high";
  return "peak";
}

export function cardioDistanceTierLabel(tier: CardioDistanceTier): string {
  if (tier === "very_low") return "Very Low";
  if (tier === "peak") return "Peak";
  if (tier === "very_high") return "Very High";
  if (tier === "low") return "Low";
  if (tier === "active") return "Active";
  return "High";
}

/** Bar / pill palette index 0–5 — aligns with {@link ACTIVITY_STEP_RATING_TIERS} and Strength “Peak” (index 5). */
export function cardioDistanceTierIndexForBar(tier: CardioDistanceTier): number {
  if (tier === "very_low") return 0;
  if (tier === "low") return 1;
  if (tier === "active") return 2;
  if (tier === "high") return 3;
  if (tier === "very_high") return 4;
  return 5;
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

function isGenericWorkoutTitleLabel(label: string): boolean {
  const n = label.trim().toLowerCase();
  return n.length === 0 || n === "workout" || n === "cardio";
}

/**
 * Apple Watch surfaces qualifier-prefixed cardio titles such as `"Outdoor Run"`, `"Indoor Walk"`,
 * `"Pool Swim"`, `"Open Water Swim"`. These carry strictly more information than the family label
 * collapse (`hkActivityIdIsRunningFamily` → `"Running"`) and should be preferred when present.
 *
 * A string qualifies as a richer label only when it begins with a known qualifier and contains a
 * known cardio sport token; we explicitly avoid `formatWorkoutTitle`-ing arbitrary user text.
 */
const RICH_HK_LABEL_PREFIX = /^(outdoor|indoor|trail|treadmill|track|pool|open\s+water|mountain)\b/i;
const RICH_HK_LABEL_SPORT_TOKEN =
  /\b(run|running|walk|walking|cycle|cycling|hike|hiking|swim|swimming|row|rowing|ski|skiing|skate|skating|paddle|paddling)\b/i;

function pickRichHkModalityLabel(activityName: string | null | undefined): string | null {
  if (activityName == null) return null;
  const trimmed = String(activityName).trim();
  if (trimmed.length === 0) return null;
  if (!RICH_HK_LABEL_PREFIX.test(trimmed)) return null;
  if (!RICH_HK_LABEL_SPORT_TOKEN.test(trimmed)) return null;
  return formatWorkoutTitle(trimmed);
}

/**
 * Single-source modality label for one raw workout row (presentation only).
 *
 * Priority:
 *   1. Apple Watch qualifier-prefixed label (`"Outdoor Run"`, `"Indoor Walk"`, …) — preserves the
 *      richer surface label the user chose on-watch, even when the HK activityId resolves to a
 *      family that {@link hkActivityIdIsRunningFamily} / {@link hkActivityIdIsWalkingFamily} would
 *      otherwise collapse to `"Running"` / `"Walking"`.
 *   2. HealthKit activityId families (`"Running"`, `"Walking"`).
 *   3. HealthKit display label table.
 *   4. `activityName` / `sport` / `title` fallback (formatted, generic buckets dropped).
 *   5. `"Unknown"`.
 *
 * Raw HK truth is not mutated; this is presentation-only.
 */
export function cardioModalityLabelFromWorkout(workout: WorkoutHistoryItem): string {
  const id = workout.hk?.activityId;
  const richFromActivityName = pickRichHkModalityLabel(workout.activityName ?? null);
  if (richFromActivityName != null) return richFromActivityName;
  const richFromTitle = pickRichHkModalityLabel(workout.title ?? null);
  if (richFromTitle != null) return richFromTitle;
  if (hkActivityIdIsRunningFamily(id)) return "Running";
  if (hkActivityIdIsWalkingFamily(id)) return "Walking";
  const hk = displayLabelForAppleHealthKitWorkoutActivityType(id ?? null);
  if (hk != null && hk.trim().length > 0 && !isGenericWorkoutTitleLabel(hk)) {
    return hk;
  }
  if (workout.activityName != null && String(workout.activityName).trim().length > 0) {
    const t = formatWorkoutTitle(workout.activityName);
    if (!isGenericWorkoutTitleLabel(t)) return t;
  }
  if (workout.sport != null && String(workout.sport).trim().length > 0) {
    const t = formatWorkoutTitle(workout.sport);
    if (!isGenericWorkoutTitleLabel(t)) return t;
  }
  const title = formatWorkoutTitle(workout.title);
  if (!isGenericWorkoutTitleLabel(title)) return title;
  return "Unknown";
}

function workoutRowDistanceMeters(w: WorkoutHistoryItem): number {
  return typeof w.distanceMeters === "number" && Number.isFinite(w.distanceMeters) && w.distanceMeters > 0
    ? w.distanceMeters
    : 0;
}

function workoutRowDurationMinutes(w: WorkoutHistoryItem): number {
  const d = w.durationMinutes;
  return typeof d === "number" && Number.isFinite(d) && d > 0 ? d : 0;
}

/** HK activity id is non-Other and maps to a known modality (enum table) — authoritative for merge resolution. */
function hasAuthoritativeAppleHealthActivityId(w: WorkoutHistoryItem): boolean {
  const id = w.hk?.activityId;
  if (id == null || !Number.isFinite(id)) return false;
  if (Math.trunc(id) === HK_WORKOUT_ACTIVITY_TYPE_OTHER) return false;
  return displayLabelForAppleHealthKitWorkoutActivityType(id) != null;
}

/**
 * Tie-break among rows **after** HK family priority: distance, then duration, then id (presentation-only).
 */
function pickBestWorkoutRowByDistanceThenDuration(workouts: readonly WorkoutHistoryItem[]): WorkoutHistoryItem | null {
  if (workouts.length === 0) return null;
  const sorted = [...workouts].sort((a, b) => {
    const dd = workoutRowDistanceMeters(b) - workoutRowDistanceMeters(a);
    if (dd !== 0) return dd;
    const dm = workoutRowDurationMinutes(b) - workoutRowDurationMinutes(a);
    if (dm !== 0) return dm;
    return a.id.localeCompare(b.id);
  });
  return sorted[0] ?? null;
}

/**
 * When Apple merges multiple raw samples (e.g. Indoor Run HK Running + stray Walking GPS):
 * prefer **authoritative HealthKit activityId**, Running family over Walking **before** using distance.
 * Indoor Run uses the same {@link HK_WORKOUT_ACTIVITY_TYPE_RUNNING} (37) as outdoor Running.
 */
export function pickRepresentativeWorkoutForCardioModality(session: ReconciledWorkoutSession): WorkoutHistoryItem | null {
  const ws = session.workouts;
  if (ws.length === 0) return null;
  if (ws.length === 1) return ws[0]!;

  const authoritative = ws.filter(hasAuthoritativeAppleHealthActivityId);
  if (authoritative.length > 0) {
    const runningHk = authoritative.filter((w) => hkActivityIdIsRunningFamily(w.hk?.activityId));
    if (runningHk.length > 0) {
      return pickBestWorkoutRowByDistanceThenDuration(runningHk);
    }
    const walkingHk = authoritative.filter((w) => hkActivityIdIsWalkingFamily(w.hk?.activityId));
    if (walkingHk.length > 0) {
      return pickBestWorkoutRowByDistanceThenDuration(walkingHk);
    }
    return pickBestWorkoutRowByDistanceThenDuration(authoritative);
  }

  const byDist = pickBestWorkoutRowByDistanceThenDuration(ws);
  if (byDist != null && workoutRowDistanceMeters(byDist) > 0) return byDist;

  const sorted = [...ws].sort((a, b) => {
    const ta = a.start ?? a.observedAt ?? "";
    const tb = b.start ?? b.observedAt ?? "";
    const c = ta.localeCompare(tb);
    if (c !== 0) return c;
    return a.id.localeCompare(b.id);
  });
  return sorted[0] ?? ws[0]!;
}

export function formatCardioSessionSubtitle(session: ReconciledWorkoutSession): string {
  const w = pickRepresentativeWorkoutForCardioModality(session);
  if (w == null) return "Unknown";
  return cardioModalityLabelFromWorkout(w);
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

/**
 * Cardio **calendar / history / mileage totals** (display surfaces): session counts only when the
 * representative row’s modality label is not a generic bucket (“Other”, “Unknown”, …).
 *
 * This is intentionally **stricter** than {@link classifyWorkoutEvidence}: distance-only “Other” may
 * still classify as cardio for reconciliation, but must not inflate Cardio miles baselines.
 */
export function isSupportedCardioSessionModality(session: ReconciledWorkoutSession): boolean {
  const rep = pickRepresentativeWorkoutForCardioModality(session);
  if (rep == null) return false;
  const label = cardioModalityLabelFromWorkout(rep);
  return isSupportedCardioModalityLabel(label);
}

export function isDisplayableCardioHistorySession(session: ReconciledWorkoutSession): boolean {
  if (session.sessionType !== "cardio") return false;
  if (!isSupportedCardioSessionModality(session)) return false;
  const subtitle = formatCardioSessionSubtitle(session).trim().toLowerCase();
  const miles = cardioSessionDistanceMiles(session);
  const hasDistance = miles != null && miles > 0;

  if (subtitle === "other" || subtitle === "unknown" || subtitle === "uncategorized") {
    return hasDistance;
  }
  return true;
}

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

export function getThisWeekCardioSessions(
  sessions: readonly RecentWorkoutSessionEntry[],
  weekDaysInOrder: readonly string[],
): RecentWorkoutSessionEntry[] {
  const dayOrder = new Map(weekDaysInOrder.map((day, idx) => [day, idx]));
  const filtered = sessions.filter((entry) => {
    if (!dayOrder.has(entry.day)) return false;
    if (!isDisplayableCardioHistorySession(entry.session)) return false;
    return true;
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

function sessionHasAuthoritativeRunningHk(session: ReconciledWorkoutSession): boolean {
  return session.workouts.some((w) => hkActivityIdIsRunningFamily(w.hk?.activityId));
}

function sessionHasAuthoritativeWalkingHk(session: ReconciledWorkoutSession): boolean {
  return session.workouts.some((w) => hkActivityIdIsWalkingFamily(w.hk?.activityId));
}

function sessionHasAnyAuthoritativeHk(session: ReconciledWorkoutSession): boolean {
  return session.workouts.some(hasAuthoritativeAppleHealthActivityId);
}

function sessionRepresentativeLabelHasQualifier(session: ReconciledWorkoutSession): boolean {
  const rep = pickRepresentativeWorkoutForCardioModality(session);
  if (rep == null) return false;
  return (
    pickRichHkModalityLabel(rep.activityName ?? null) != null ||
    pickRichHkModalityLabel(rep.title ?? null) != null
  );
}

function sessionTotalDurationMinutes(session: ReconciledWorkoutSession): number {
  let total = 0;
  let hasValue = false;
  for (const w of session.workouts) {
    const d = w.durationMinutes;
    if (typeof d === "number" && Number.isFinite(d) && d > 0) {
      total += d;
      hasValue = true;
    }
  }
  if (hasValue) return total;
  const sd = session.durationMinutes;
  return typeof sd === "number" && Number.isFinite(sd) && sd > 0 ? sd : 0;
}

/**
 * Cardio-modality session tier (lower = better):
 *   0 → authoritative HK running family present (Outdoor / Indoor Run)
 *   1 → authoritative HK walking family present
 *   2 → other authoritative HK modality (Cycling, Rowing, Swimming, …)
 *   3 → no authoritative HK (distance-only / generic)
 */
function representativeCardioSessionTier(session: ReconciledWorkoutSession): number {
  if (sessionHasAuthoritativeRunningHk(session)) return 0;
  if (sessionHasAuthoritativeWalkingHk(session)) return 1;
  if (sessionHasAnyAuthoritativeHk(session)) return 2;
  return 3;
}

/**
 * Choose the **best representative cardio session** for a calendar day (e.g. the Cardio Today hero).
 *
 * Priority — strictly ordered (higher comparator wins, ties cascade):
 *   1. Lower {@link representativeCardioSessionTier} (HK Running > Walking > other HK > generic).
 *   2. Representative workout exposes a qualifier-prefixed HK label (`"Outdoor Run"`, `"Indoor Walk"`, …).
 *   3. Higher total session distance (meters).
 *   4. Longer total session duration (minutes).
 *   5. Earlier chronological start (stable tie-break with session id).
 *
 * Returns `null` only when `sessions` is empty. **Does not mutate** any input; pure presentation-layer
 * selection. Callers are responsible for filtering to displayable cardio sessions
 * ({@link isDisplayableCardioHistorySession}) beforehand if that's the desired contract.
 */
export function pickBestRepresentativeCardioSessionForDay(
  sessions: readonly ReconciledWorkoutSession[],
): ReconciledWorkoutSession | null {
  if (sessions.length === 0) return null;
  if (sessions.length === 1) return sessions[0] ?? null;

  const sorted = [...sessions].sort((a, b) => {
    const ta = representativeCardioSessionTier(a);
    const tb = representativeCardioSessionTier(b);
    if (ta !== tb) return ta - tb;

    const qa = sessionRepresentativeLabelHasQualifier(a) ? 1 : 0;
    const qb = sessionRepresentativeLabelHasQualifier(b) ? 1 : 0;
    if (qa !== qb) return qb - qa;

    const da = cardioSessionDistanceMeters(a) ?? 0;
    const db = cardioSessionDistanceMeters(b) ?? 0;
    if (da !== db) return db - da;

    const ma = sessionTotalDurationMinutes(a);
    const mb = sessionTotalDurationMinutes(b);
    if (ma !== mb) return mb - ma;

    const ka = sessionChronologicalSortKey(a);
    const kb = sessionChronologicalSortKey(b);
    const c = ka.localeCompare(kb);
    if (c !== 0) return c;
    return a.id.localeCompare(b.id);
  });
  return sorted[0] ?? null;
}

/**
 * Centralized cardio display-title resolver — same precedence as
 * {@link resolveWorkoutSessionSurfaceTitle}, scoped to the cardio surface so we never bypass the
 * shared rename / durable-override infrastructure:
 *
 *   1. Durable / server `workout_title_override` (via {@link pickDurableTitleForSession}).
 *   2. AsyncStorage `customTitle` override (via {@link pickWorkoutOverrideForSession}).
 *   3. {@link formatCardioSessionSubtitle} → representative workout's modality label
 *      (`"Outdoor Run"`, `"Walking"`, …).
 *
 * Used by Cardio Today hero, Cardio This Week rows, recent cardio lists, and cardio detail
 * surfaces so renames apply uniformly across the Cardio domain.
 */
export function resolveCardioSessionDisplayName(
  session: ReconciledWorkoutSession,
  overridesByWorkoutId: Record<string, WorkoutOverride | undefined>,
  durableTitlesByWorkoutId: Record<string, string | undefined> | undefined,
): string {
  const durable = pickDurableTitleForSession(session, durableTitlesByWorkoutId);
  if (durable && !isGenericWorkoutTitleLabel(durable)) {
    return formatWorkoutTitle(durable);
  }
  const sessionOverride = pickWorkoutOverrideForSession(session, overridesByWorkoutId);
  const asyncTitle = sessionOverride?.customTitle?.trim();
  if (asyncTitle && !isGenericWorkoutTitleLabel(asyncTitle)) {
    return formatWorkoutTitle(asyncTitle);
  }
  return formatCardioSessionSubtitle(session);
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
