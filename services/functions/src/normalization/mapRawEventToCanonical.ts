// services/functions/src/normalization/mapRawEventToCanonical.ts
import type {
  CanonicalEvent,
  RawEvent,
  IsoDateTimeString,
  YmdDateString,
  SleepCanonicalEvent,
  StepsCanonicalEvent,
  WorkoutCanonicalEvent,
  HrvCanonicalEvent,
  StrengthWorkoutCanonicalEvent,
  StrengthWorkoutCanonicalSet,
} from "../types/health";

/**
 * RawEvent → CanonicalEvent mapper.
 *
 * Properties:
 * - Pure: no Firestore/Admin calls, no I/O.
 * - Deterministic: same RawEvent → same CanonicalEvent.
 * - Safe to reuse in the Reprocessing Engine.
 *
 * IMPORTANT:
 * - `day` is derived server-side from (time/start, timezone).
 * - Do NOT trust any client-provided `day`.
 *
 * Phase 1 note:
 * - Some RawEvent kinds are "memory-only" and intentionally do NOT emit CanonicalEvents
 *   (e.g., upload.file with no parsing). Those return UNSUPPORTED_KIND with a marker
 *   so callers can treat them as a valid no-op.
 */

/**
 * RawEvent kinds that are fact-only: they update derived truth (dailyFacts, intelligenceContext)
 * but do NOT emit canonical events. Constitutional: canonical = "what happened"; weight is a
 * measurement fact, not an event. Phase 3A: withings.body_measurement = same semantics as weight.
 */
export const FACT_ONLY_RAW_EVENT_KINDS = ["weight", "withings.body_measurement"] as const;

export type FactOnlyRawEventKind = (typeof FACT_ONLY_RAW_EVENT_KINDS)[number];

export const isFactOnlyKind = (kind: string): kind is FactOnlyRawEventKind =>
  (FACT_ONLY_RAW_EVENT_KINDS as readonly string[]).includes(kind);

export type MappingFailureReason =
  | "UNSUPPORTED_PROVIDER"
  | "UNSUPPORTED_KIND"
  | "MALFORMED_PAYLOAD";

export type MappingFailure = {
  ok: false;
  reason: MappingFailureReason;
  details?: Record<string, unknown>;
};

export type MappingSuccess = {
  ok: true;
  canonical: CanonicalEvent;
};

export type MappingResult = MappingSuccess | MappingFailure;

// -----------------------------------------------------------------------------
// Canonical dayKey derivation (AUTHORITATIVE)
// -----------------------------------------------------------------------------

/**
 * Canonical dayKey derivation using IANA timezone.
 *
 * Algorithm must match the ingestion acknowledgement semantics:
 *   Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(iso))
 *
 * Returns null if:
 * - ISO timestamp is invalid, OR
 * - timeZone is invalid (fail closed; no UTC fallback here)
 */
const ymdInTimeZoneFromIso = (
  iso: string,
  timeZone: string,
): YmdDateString | null => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  try {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone });
    return fmt.format(d) as YmdDateString;
  } catch {
    return null;
  }
};

// -----------------------------------------------------------------------------
// Manual payload shapes & guards
// -----------------------------------------------------------------------------

type ManualWindowBase = {
  start: IsoDateTimeString;
  end: IsoDateTimeString;
  timezone: string;
};

type ManualSleepPayload = ManualWindowBase & {
  totalMinutes: number;
  efficiency?: number | null;
  latencyMinutes?: number | null;
  awakenings?: number | null;
  isMainSleep: boolean;
};

type ManualStepsPayload = ManualWindowBase & {
  steps: number;
  distanceKm?: number | null;
  moveMinutes?: number | null;
};

type ManualWorkoutPayload = ManualWindowBase & {
  sport: string;
  intensity?: "easy" | "moderate" | "hard";
  durationMinutes: number;
  trainingLoad?: number | null;
};

type ManualWeightPayload = {
  time: IsoDateTimeString;
  timezone: string;
  weightKg: number;
  bodyFatPercent?: number | null;
};

type ManualHrvPayload = {
  time: IsoDateTimeString;
  timezone: string;
  rmssdMs?: number | null;
  sdnnMs?: number | null;
  measurementType?: "nightly" | "spot";
};

type ManualStrengthWorkoutSetPayload = {
  reps: number;
  load: number;
  unit: "lb" | "kg";
  isWarmup?: boolean;
  rpe?: number;
  rir?: number;
  notes?: string;
};

type ManualStrengthWorkoutExercisePayload = {
  name: string;
  sets: ManualStrengthWorkoutSetPayload[];
};

type ManualStrengthWorkoutPayload = {
  startedAt: IsoDateTimeString;
  timeZone: string;
  exercises: ManualStrengthWorkoutExercisePayload[];
};

type ManualPayloadByKind = {
  sleep: ManualSleepPayload;
  steps: ManualStepsPayload;
  workout: ManualWorkoutPayload;
  weight: ManualWeightPayload;
  hrv: ManualHrvPayload;
  strength_workout: ManualStrengthWorkoutPayload;
};

type ManualKind = keyof ManualPayloadByKind;

const MANUAL_KINDS: readonly ManualKind[] = [
  "sleep",
  "steps",
  "workout",
  "weight",
  "hrv",
  "strength_workout",
] as const;

const isManualKind = (kind: RawEvent["kind"]): kind is ManualKind =>
  (MANUAL_KINDS as readonly string[]).includes(kind);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasString = (obj: Record<string, unknown>, key: string): boolean =>
  typeof obj[key] === "string";

const hasNumber = (obj: Record<string, unknown>, key: string): boolean =>
  typeof obj[key] === "number";

const isManualWindowBase = (value: unknown): value is ManualWindowBase => {
  if (!isRecord(value)) return false;
  return hasString(value, "start") && hasString(value, "end") && hasString(value, "timezone");
};

const isManualSleepPayload = (value: unknown): value is ManualSleepPayload => {
  if (!isRecord(value)) return false;
  if (!isManualWindowBase(value)) return false;
  if (!hasNumber(value, "totalMinutes")) return false;
  return typeof (value as Record<string, unknown>)["isMainSleep"] === "boolean";
};

const isManualStepsPayload = (value: unknown): value is ManualStepsPayload => {
  if (!isRecord(value)) return false;
  if (!isManualWindowBase(value)) return false;
  return hasNumber(value, "steps");
};

const isManualWorkoutPayload = (value: unknown): value is ManualWorkoutPayload => {
  if (!isRecord(value)) return false;
  if (!isManualWindowBase(value)) return false;
  return hasString(value, "sport") && hasNumber(value, "durationMinutes");
};

const isManualWeightPayload = (value: unknown): value is ManualWeightPayload => {
  if (!isRecord(value)) return false;
  return hasString(value, "time") && hasString(value, "timezone") && hasNumber(value, "weightKg");
};

const isManualHrvPayload = (value: unknown): value is ManualHrvPayload => {
  if (!isRecord(value)) return false;
  return hasString(value, "time") && hasString(value, "timezone");
};

const isManualStrengthWorkoutPayload = (
  value: unknown,
): value is ManualStrengthWorkoutPayload => {
  if (!isRecord(value)) return false;
  if (!hasString(value, "startedAt") || !hasString(value, "timeZone")) return false;
  const exs = value.exercises;
  if (!Array.isArray(exs) || exs.length === 0) return false;
  for (const ex of exs) {
    if (!isRecord(ex) || !hasString(ex, "name")) return false;
    const sets = ex.sets;
    if (!Array.isArray(sets) || sets.length === 0) return false;
    for (const s of sets) {
      if (!isRecord(s)) return false;
      if (
        typeof s.reps !== "number" ||
        s.reps < 0 ||
        !Number.isInteger(s.reps)
      )
        return false;
      if (typeof s.load !== "number" || s.load < 0) return false;
      if (s.unit !== "lb" && s.unit !== "kg") return false;
      if (s.rpe !== undefined && s.rir !== undefined) return false;
      if (s.rpe !== undefined && (typeof s.rpe !== "number" || s.rpe < 0 || s.rpe > 10))
        return false;
      if (s.rir !== undefined && (typeof s.rir !== "number" || s.rir < 0 || s.rir > 10))
        return false;
      if (s.notes !== undefined && (typeof s.notes !== "string" || s.notes.length > 256))
        return false;
    }
  }
  return true;
};

/**
 * Parse manual payload based on kind.
 * Constrains K to keyof ManualPayloadByKind to allow indexed access.
 */
const parseManualPayload = <K extends ManualKind>(
  kind: K,
  payload: unknown,
): ManualPayloadByKind[K] | null => {
  switch (kind) {
    case "sleep":
      return isManualSleepPayload(payload) ? (payload as ManualPayloadByKind[K]) : null;
    case "steps":
      return isManualStepsPayload(payload) ? (payload as ManualPayloadByKind[K]) : null;
    case "workout":
      return isManualWorkoutPayload(payload) ? (payload as ManualPayloadByKind[K]) : null;
    case "weight":
      return isManualWeightPayload(payload) ? (payload as ManualPayloadByKind[K]) : null;
    case "hrv":
      return isManualHrvPayload(payload) ? (payload as ManualPayloadByKind[K]) : null;
    case "strength_workout":
      return isManualStrengthWorkoutPayload(payload)
        ? (payload as ManualPayloadByKind[K])
        : null;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
};

// -----------------------------------------------------------------------------
// Manual mappers (provider === "manual")
// -----------------------------------------------------------------------------

const mapManualSleep = (
  raw: RawEvent,
  payload: ManualSleepPayload,
): SleepCanonicalEvent | null => {
  const day = ymdInTimeZoneFromIso(payload.start, payload.timezone);
  if (!day) return null;

  return {
    id: raw.id,
    userId: raw.userId,
    sourceId: raw.sourceId,
    kind: "sleep",
    start: payload.start,
    end: payload.end,
    day,
    timezone: payload.timezone,
    createdAt: raw.receivedAt,
    updatedAt: raw.receivedAt,
    schemaVersion: 1,
    totalMinutes: payload.totalMinutes,
    efficiency: payload.efficiency ?? null,
    latencyMinutes: payload.latencyMinutes ?? null,
    awakenings: payload.awakenings ?? null,
    isMainSleep: payload.isMainSleep,
  };
};

const mapManualSteps = (
  raw: RawEvent,
  payload: ManualStepsPayload,
): StepsCanonicalEvent | null => {
  const day = ymdInTimeZoneFromIso(payload.start, payload.timezone);
  if (!day) return null;

  return {
    id: raw.id,
    userId: raw.userId,
    sourceId: raw.sourceId,
    kind: "steps",
    start: payload.start,
    end: payload.end,
    day,
    timezone: payload.timezone,
    createdAt: raw.receivedAt,
    updatedAt: raw.receivedAt,
    schemaVersion: 1,
    steps: payload.steps,
    distanceKm: payload.distanceKm ?? null,
    moveMinutes: payload.moveMinutes ?? null,
  };
};

const mapManualWorkout = (
  raw: RawEvent,
  payload: ManualWorkoutPayload,
): WorkoutCanonicalEvent | null => {
  const day = ymdInTimeZoneFromIso(payload.start, payload.timezone);
  if (!day) return null;

  const base: WorkoutCanonicalEvent = {
    id: raw.id,
    userId: raw.userId,
    sourceId: raw.sourceId,
    kind: "workout",
    start: payload.start,
    end: payload.end,
    day,
    timezone: payload.timezone,
    createdAt: raw.receivedAt,
    updatedAt: raw.receivedAt,
    schemaVersion: 1,
    sport: payload.sport,
    durationMinutes: payload.durationMinutes,
    trainingLoad: payload.trainingLoad ?? null,
  };

  if (payload.intensity) {
    base.intensity = payload.intensity;
  }

  return base;
};

const mapManualHrv = (
  raw: RawEvent,
  payload: ManualHrvPayload,
): HrvCanonicalEvent | null => {
  const day = ymdInTimeZoneFromIso(payload.time, payload.timezone);
  if (!day) return null;

  const base: HrvCanonicalEvent = {
    id: raw.id,
    userId: raw.userId,
    sourceId: raw.sourceId,
    kind: "hrv",
    start: payload.time,
    end: payload.time,
    day,
    timezone: payload.timezone,
    createdAt: raw.receivedAt,
    updatedAt: raw.receivedAt,
    schemaVersion: 1,
    rmssdMs: payload.rmssdMs ?? null,
    sdnnMs: payload.sdnnMs ?? null,
  };

  if (payload.measurementType) {
    base.measurementType = payload.measurementType;
  }

  return base;
};

const mapManualStrengthWorkout = (
  raw: RawEvent,
  payload: ManualStrengthWorkoutPayload,
): StrengthWorkoutCanonicalEvent | null => {
  const day = ymdInTimeZoneFromIso(payload.startedAt, payload.timeZone);
  if (!day) return null;

  const exercises: StrengthWorkoutCanonicalSet[] = [];
  for (const ex of payload.exercises) {
    for (const s of ex.sets) {
      const set: StrengthWorkoutCanonicalSet = {
        exercise: ex.name,
        reps: s.reps,
        load: s.load,
        unit: s.unit,
      };
      if (s.isWarmup !== undefined) set.isWarmup = s.isWarmup;
      if (s.rpe !== undefined) set.rpe = s.rpe;
      else if (s.rir !== undefined) set.rir = s.rir;
      if (s.notes !== undefined) set.notes = s.notes;
      exercises.push(set);
    }
  }

  return {
    id: raw.id,
    userId: raw.userId,
    sourceId: raw.sourceId,
    kind: "strength_workout",
    start: payload.startedAt,
    end: payload.startedAt,
    day,
    timezone: payload.timeZone,
    createdAt: raw.receivedAt,
    updatedAt: raw.receivedAt,
    schemaVersion: 1,
    exercises,
  };
};

// -----------------------------------------------------------------------------
// Entry point
// -----------------------------------------------------------------------------

export const mapRawEventToCanonical = (raw: RawEvent): MappingResult => {
  /**
   * Phase 1: memory-only uploads.
   * Upload events are intentionally NOT normalizable into canonical health facts.
   * They are still valid RawEvents and should be treated as a valid no-op by callers.
   */
  if (raw.kind === "upload.file") {
    return {
      ok: false,
      reason: "UNSUPPORTED_KIND",
      details: { kind: raw.kind, rawEventId: raw.id, memoryOnly: true },
    };
  }

  /**
   * Phase 2: memory-only incomplete events.
   * "Something happened, details later" — no canonical normalization.
   */
  if (raw.kind === "incomplete") {
    return {
      ok: false,
      reason: "UNSUPPORTED_KIND",
      details: { kind: raw.kind, rawEventId: raw.id, memoryOnly: true },
    };
  }

  /**
   * Phase 3A — Withings body measurement: fact-only (same as manual weight).
   */
  if (raw.kind === "withings.body_measurement") {
    return {
      ok: false,
      reason: "UNSUPPORTED_KIND",
      details: { kind: raw.kind, rawEventId: raw.id, factOnly: true },
    };
  }

  if (raw.provider !== "manual") {
    return {
      ok: false,
      reason: "UNSUPPORTED_PROVIDER",
      details: { provider: raw.provider, kind: raw.kind, rawEventId: raw.id },
    };
  }

  if (!isManualKind(raw.kind)) {
    return {
      ok: false,
      reason: "UNSUPPORTED_KIND",
      details: { provider: raw.provider, kind: raw.kind, rawEventId: raw.id },
    };
  }

  switch (raw.kind) {
    case "sleep": {
      const payload = parseManualPayload("sleep", raw.payload);
      if (!payload) {
        return {
          ok: false,
          reason: "MALFORMED_PAYLOAD",
          details: { rawEventId: raw.id },
        };
      }
      const canonical = mapManualSleep(raw, payload);
      if (!canonical) {
        return {
          ok: false,
          reason: "MALFORMED_PAYLOAD",
          details: { rawEventId: raw.id, field: "start", reason: "INVALID_TIME_OR_TIMEZONE" },
        };
      }
      return { ok: true, canonical };
    }

    case "steps": {
      const payload = parseManualPayload("steps", raw.payload);
      if (!payload) {
        return {
          ok: false,
          reason: "MALFORMED_PAYLOAD",
          details: { rawEventId: raw.id },
        };
      }
      const canonical = mapManualSteps(raw, payload);
      if (!canonical) {
        return {
          ok: false,
          reason: "MALFORMED_PAYLOAD",
          details: { rawEventId: raw.id, field: "start", reason: "INVALID_TIME_OR_TIMEZONE" },
        };
      }
      return { ok: true, canonical };
    }

    case "workout": {
      const payload = parseManualPayload("workout", raw.payload);
      if (!payload) {
        return {
          ok: false,
          reason: "MALFORMED_PAYLOAD",
          details: { rawEventId: raw.id },
        };
      }
      const canonical = mapManualWorkout(raw, payload);
      if (!canonical) {
        return {
          ok: false,
          reason: "MALFORMED_PAYLOAD",
          details: { rawEventId: raw.id, field: "start", reason: "INVALID_TIME_OR_TIMEZONE" },
        };
      }
      return { ok: true, canonical };
    }

    case "weight":
      // Fact-only: handled by early return; this case satisfies exhaustive switch
      return {
        ok: false,
        reason: "UNSUPPORTED_KIND",
        details: { kind: raw.kind, rawEventId: raw.id, factOnly: true },
      };

    case "hrv": {
      const payload = parseManualPayload("hrv", raw.payload);
      if (!payload) {
        return {
          ok: false,
          reason: "MALFORMED_PAYLOAD",
          details: { rawEventId: raw.id },
        };
      }
      const canonical = mapManualHrv(raw, payload);
      if (!canonical) {
        return {
          ok: false,
          reason: "MALFORMED_PAYLOAD",
          details: { rawEventId: raw.id, field: "time", reason: "INVALID_TIME_OR_TIMEZONE" },
        };
      }
      return { ok: true, canonical };
    }

    case "strength_workout": {
      const payload = parseManualPayload("strength_workout", raw.payload);
      if (!payload) {
        return {
          ok: false,
          reason: "MALFORMED_PAYLOAD",
          details: { rawEventId: raw.id },
        };
      }
      const canonical = mapManualStrengthWorkout(raw, payload);
      if (!canonical) {
        return {
          ok: false,
          reason: "MALFORMED_PAYLOAD",
          details: {
            rawEventId: raw.id,
            field: "startedAt",
            reason: "INVALID_TIME_OR_TIMEZONE",
          },
        };
      }
      return { ok: true, canonical };
    }

    default: {
      const _exhaustive: never = raw.kind;
      return _exhaustive;
    }
  }
};