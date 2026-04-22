import type { RawEventDoc } from "@oli/contracts";
import { classifyWorkoutType } from "@/lib/data/workouts/workoutMarkerFlags";
import { computeStrengthVolumeKgFromStrengthWorkoutPayload } from "@/lib/data/workouts/strengthWorkoutVolumeKg";
import { kgToLbs } from "@/lib/metrics/metricUnits";
import type { ManualWorkoutExerciseSummary } from "@/lib/workouts/journal/manualWorkoutSummary";

/** Best-effort minutes per zone (1–5) when present on raw payload; not part of strict ingest schema. */
export type HeartRateZoneMinutes5 = readonly [number, number, number, number, number];

/**
 * Resolves ingestion `provider` for UI and delete eligibility.
 * GET /users/me/raw-events list rows omit `provider`; calendar hydrate synthesizes docs with empty provider — infer from `sourceId`
 * (HealthKit imports use `sourceId` "healthkit" with Firestore `provider` "apple_health"; manual uses `sourceId` "manual").
 */
export function resolveWorkoutIngestProvider(raw: { provider?: string; sourceId?: string }): string | undefined {
  const trimmed = typeof raw.provider === "string" ? raw.provider.trim() : "";
  if (trimmed === "manual" || trimmed === "apple_health") return trimmed;
  if (trimmed.length > 0) return trimmed;
  const sid = typeof raw.sourceId === "string" ? raw.sourceId : "";
  if (sid === "manual") return "manual";
  if (sid === "healthkit" || sid === "apple_health") return "apple_health";
  return undefined;
}

/**
 * Strength overview DELETE /ingest eligibility: deletable raw row (hydrate-backed) + provider allowlist + workout kinds.
 */
export function strengthWorkoutRowEligibleForDeleteFromOli(workout: WorkoutHistoryItem | null | undefined): boolean {
  if (!workout) return false;
  if (workout.isDeletableRawEvent !== true) return false;
  const p = resolveWorkoutIngestProvider(workout);
  if (p !== "manual" && p !== "apple_health") return false;
  const k = workout.rawKind;
  if (k === undefined) return true;
  return k === "strength_workout" || k === "workout";
}

export type ParseWorkoutHistoryItemOptions = {
  /**
   * Firestore document id from the listing query (path `rawEvents/{id}`).
   * When the stored document body's `id` field can diverge from the doc ref (legacy / partial writes),
   * this must be the id used for DELETE /ingest/:rawEventId and other raw-targeted APIs.
   */
  authoritativeRawEventId?: string;
  /**
   * When true, this item was produced from GET /users/me/raw-events hydration (listed doc id in `id`).
   * Omit for summary-only or synthetic parses so Strength Delete stays hidden.
   */
  isDeletableRawEvent?: boolean;
};

export type WorkoutHistoryItem = {
  /** Firestore `users/{uid}/rawEvents/{id}` document id (authoritative for DELETE /ingest). */
  id: string;
  observedAt: string;
  sourceId: string;
  /** RawEvent ingestion provider (e.g. `manual`, `apple_health`); aligns with DELETE /ingest eligibility. */
  provider?: string;
  /** Original RawEvent kind (e.g. `strength_workout`, `workout`) for domain routing. */
  rawKind?: string;
  title: string;
  workoutType?: "strength" | "cardio";
  sport?: string | null;
  activityName?: string | null;
  start: string | null;
  end: string | null;
  durationMinutes: number | null;
  calories: number | null;
  /** Meters when upstream stores it on payload (e.g. future HK fields); otherwise omitted. */
  distanceMeters?: number | null;
  /** Optional zone minutes on payload; omitted when absent or invalid. */
  heartRateZoneMinutes?: HeartRateZoneMinutes5 | null;
  hk?: { sourceId: string | null; activityId: number | null };
  /** Parsed from `strength_workout` payload exercises when volume can be computed; omitted otherwise. */
  strengthVolumeKg?: number | null;
  /**
   * Exercises parsed from ingested `strength_workout` payload (server truth).
   * Used when the local workout journal is missing or unmatched so the UI can still list sets.
   */
  strengthIngestExercises?: ManualWorkoutExerciseSummary[];
  /** Present only when `strength_workout` payload included `displayName` (title resolution vs exercise-derived title). */
  strengthIngestDisplayName?: string;
  /**
   * Set only for rows produced from raw-events calendar hydrate (listed doc existed at fetch time).
   * Strength Delete requires this to be true alongside provider allowlist.
   */
  isDeletableRawEvent?: boolean;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function loadKgFromSet(load: number, unit: unknown): number | null {
  if (!Number.isFinite(load) || load <= 0) return null;
  if (unit === "kg") return load;
  if (unit === "lb") return load / kgToLbs(1);
  return null;
}

/**
 * Best-effort parse of `strength_workout` ingest exercises into the same summary shape as the journal reducer.
 */
export function parseStrengthIngestExercisesFromPayload(
  rawEventId: string,
  payload: Record<string, unknown>,
): ManualWorkoutExerciseSummary[] | undefined {
  const exercisesRaw = payload.exercises;
  if (!Array.isArray(exercisesRaw)) return undefined;
  const out: ManualWorkoutExerciseSummary[] = [];
  let exIdx = 0;
  for (const ex of exercisesRaw) {
    if (!isRecord(ex)) continue;
    const nameRaw = ex.name;
    const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
    const setsRaw = ex.sets;
    if (!Array.isArray(setsRaw)) continue;
    const sets: ManualWorkoutExerciseSummary["sets"] = [];
    let setOrdinal = 0;
    for (const s of setsRaw) {
      if (!isRecord(s)) continue;
      setOrdinal += 1;
      const reps = typeof s.reps === "number" && Number.isFinite(s.reps) ? s.reps : null;
      const load = typeof s.load === "number" && Number.isFinite(s.load) ? s.load : NaN;
      const weightKg = loadKgFromSet(load, s.unit);
      const intensity =
        typeof s.rpe === "number" && Number.isFinite(s.rpe) ? s.rpe : null;
      sets.push({
        setNumber: setOrdinal,
        reps,
        weightKg,
        intensity,
        ...(s.isWarmup === true ? { isWarmup: true } : {}),
      });
    }
    if (sets.length === 0) continue;
    out.push({
      exerciseId: `exercise:ingested:${rawEventId}:${exIdx}`,
      name: name.length > 0 ? name : `Exercise ${exIdx + 1}`,
      sets,
    });
    exIdx += 1;
  }
  return out.length > 0 ? out : undefined;
}

function parseDistanceMetersFromPayload(payload: Record<string, unknown> | null): number | null {
  if (!payload) return null;
  const m =
    asNumber(payload.distanceMeters) ??
    asNumber(payload.totalDistanceMeters) ??
    (asNumber(payload.distanceKm) != null ? (asNumber(payload.distanceKm) ?? 0) * 1000 : null);
  if (m == null || m <= 0) return null;
  return m;
}

function parseHeartRateZoneMinutesFromPayload(payload: Record<string, unknown> | null): HeartRateZoneMinutes5 | null {
  if (!payload) return null;
  const z = payload.heartRateZoneMinutes;
  if (!Array.isArray(z) || z.length !== 5) return null;
  const out: number[] = [];
  for (const v of z) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
    out.push(v);
  }
  return out as unknown as HeartRateZoneMinutes5;
}

/**
 * Fail-closed, best-effort parser for workout display.
 * Never throws. If payload is missing/unexpected, returns minimal item.
 * Treats payload as unknown record to support multiple sources (manual, HK, etc.).
 */
export function parseWorkoutHistoryItem(raw: RawEventDoc, options?: ParseWorkoutHistoryItemOptions): WorkoutHistoryItem {
  const auth =
    typeof options?.authoritativeRawEventId === "string" ? options.authoritativeRawEventId.trim() : "";
  const id = auth.length > 0 ? auth : raw.id;
  const observedAt = raw.observedAt ?? raw.receivedAt;
  const sourceId = raw.sourceId ?? "unknown";
  const resolvedProvider = resolveWorkoutIngestProvider(raw);

  const rawPayload: unknown = raw.payload;
  const payload = isRecord(rawPayload) ? rawPayload : null;

  const start =
    raw.kind === "strength_workout" && payload && asString((payload as { startedAt?: unknown }).startedAt)
      ? asString((payload as { startedAt: string }).startedAt)
      : asString(payload?.start) ?? asString(raw.observedAt) ?? null;
  const end = asString(payload?.end) ?? null;

  const sport = asString(payload?.sport);
  const activityName = asString(payload?.activityName);

  let title: string;
  let strengthIngestDisplayName: string | undefined;
  if (raw.kind === "strength_workout" && payload) {
    const displayTitle = asString((payload as { displayName?: unknown }).displayName);
    if (displayTitle != null) {
      strengthIngestDisplayName = displayTitle;
      title = displayTitle;
    } else if (Array.isArray((payload as { exercises?: unknown }).exercises)) {
      const exs = (payload as { exercises: { name?: unknown }[] }).exercises;
      const first = exs[0];
      const exName = first && typeof first.name === "string" ? first.name.trim() : "";
      title = exName.length > 0 ? exName : "Strength workout";
    } else {
      title = "Strength workout";
    }
  } else {
    const nameStr = asString((payload as { name?: unknown } | null)?.name);
    if (nameStr != null) {
      title = nameStr;
    } else if (sport != null) {
      title = sport;
    } else if (activityName != null) {
      title = activityName;
    } else if (raw.kind === "workout") {
      title = "";
    } else {
      title = "Workout";
    }
  }

  const workoutType = classifyWorkoutType({
    rawKind: raw.kind,
    title,
    sport,
    activityName,
  });

  const durationMinutes =
    asNumber(payload?.durationMinutes) ??
    (asNumber(payload?.duration) != null
      ? Math.round((asNumber(payload?.duration) ?? 0) / 60)
      : null);

  const calories = asNumber(payload?.calories) ?? null;

  const distanceMeters = parseDistanceMetersFromPayload(payload);
  const heartRateZoneMinutes = parseHeartRateZoneMinutesFromPayload(payload);

  let hk: WorkoutHistoryItem["hk"] | undefined;
  if (isRecord(payload?.hk)) {
    const hkPayload = payload.hk as Record<string, unknown>;
    const hkSourceId = asString(hkPayload.sourceId);
    const hkActivityId = asNumber(hkPayload.activityId);
    hk = { sourceId: hkSourceId, activityId: hkActivityId };
  }

  const strengthVolumeKg =
    raw.kind === "strength_workout" && payload
      ? computeStrengthVolumeKgFromStrengthWorkoutPayload(payload)
      : null;

  const strengthIngestExercises =
    raw.kind === "strength_workout" && payload
      ? parseStrengthIngestExercisesFromPayload(id, payload)
      : undefined;

  return {
    id,
    observedAt,
    sourceId,
    ...(resolvedProvider !== undefined ? { provider: resolvedProvider } : {}),
    rawKind: raw.kind,
    title,
    ...(workoutType != null ? { workoutType } : {}),
    ...(sport ? { sport } : {}),
    ...(activityName ? { activityName } : {}),
    start,
    end,
    durationMinutes,
    calories,
    ...(distanceMeters != null ? { distanceMeters } : {}),
    ...(heartRateZoneMinutes != null ? { heartRateZoneMinutes } : {}),
    ...(hk ? { hk } : {}),
    ...(strengthVolumeKg != null && strengthVolumeKg > 0 ? { strengthVolumeKg } : {}),
    ...(strengthIngestExercises != null && strengthIngestExercises.length > 0
      ? { strengthIngestExercises }
      : {}),
    ...(strengthIngestDisplayName != null && strengthIngestDisplayName.length > 0
      ? { strengthIngestDisplayName }
      : {}),
    ...(options?.isDeletableRawEvent === true ? { isDeletableRawEvent: true as const } : {}),
  };
}
