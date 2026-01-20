import type {
  CanonicalEvent,
  RawEvent,
  IsoDateTimeString,
  YmdDateString,
  SleepCanonicalEvent,
  StepsCanonicalEvent,
  WorkoutCanonicalEvent,
  WeightCanonicalEvent,
  HrvCanonicalEvent,
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
// Canonical dayKey derivation
// -----------------------------------------------------------------------------

const toYmdUtc = (date: Date): YmdDateString => {
  const yyyy = String(date.getUTCFullYear()).padStart(4, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}` as YmdDateString;
};

/**
 * Canonical dayKey derivation using IANA timezone.
 * Returns null if the ISO timestamp is invalid.
 * Falls back to UTC if timezone is invalid/unavailable.
 *
 * NOTE: uses en-CA format which yields YYYY-MM-DD.
 */
const ymdInTimeZoneFromIso = (iso: string, timeZone: string): YmdDateString | null => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fmt.format(d) as YmdDateString;
  } catch {
    return toYmdUtc(d);
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

type ManualPayloadByKind = {
  sleep: ManualSleepPayload;
  steps: ManualStepsPayload;
  workout: ManualWorkoutPayload;
  weight: ManualWeightPayload;
  hrv: ManualHrvPayload;
};

type ManualKind = keyof ManualPayloadByKind;

const MANUAL_KINDS: readonly ManualKind[] = ["sleep", "steps", "workout", "weight", "hrv"] as const;

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

const mapManualWeight = (
  raw: RawEvent,
  payload: ManualWeightPayload,
): WeightCanonicalEvent | null => {
  const day = ymdInTimeZoneFromIso(payload.time, payload.timezone);
  if (!day) return null;

  return {
    id: raw.id,
    userId: raw.userId,
    sourceId: raw.sourceId,
    kind: "weight",
    start: payload.time,
    end: payload.time,
    day,
    timezone: payload.timezone,
    createdAt: raw.receivedAt,
    updatedAt: raw.receivedAt,
    schemaVersion: 1,
    weightKg: payload.weightKg,
    bodyFatPercent: payload.bodyFatPercent ?? null,
  };
};

const mapManualHrv = (raw: RawEvent, payload: ManualHrvPayload): HrvCanonicalEvent | null => {
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
        return { ok: false, reason: "MALFORMED_PAYLOAD", details: { rawEventId: raw.id } };
      }
      const canonical = mapManualSleep(raw, payload);
      if (!canonical) {
        return {
          ok: false,
          reason: "MALFORMED_PAYLOAD",
          details: { rawEventId: raw.id, field: "start" },
        };
      }
      return { ok: true, canonical };
    }

    case "steps": {
      const payload = parseManualPayload("steps", raw.payload);
      if (!payload) {
        return { ok: false, reason: "MALFORMED_PAYLOAD", details: { rawEventId: raw.id } };
      }
      const canonical = mapManualSteps(raw, payload);
      if (!canonical) {
        return {
          ok: false,
          reason: "MALFORMED_PAYLOAD",
          details: { rawEventId: raw.id, field: "start" },
        };
      }
      return { ok: true, canonical };
    }

    case "workout": {
      const payload = parseManualPayload("workout", raw.payload);
      if (!payload) {
        return { ok: false, reason: "MALFORMED_PAYLOAD", details: { rawEventId: raw.id } };
      }
      const canonical = mapManualWorkout(raw, payload);
      if (!canonical) {
        return {
          ok: false,
          reason: "MALFORMED_PAYLOAD",
          details: { rawEventId: raw.id, field: "start" },
        };
      }
      return { ok: true, canonical };
    }

    case "weight": {
      const payload = parseManualPayload("weight", raw.payload);
      if (!payload) {
        return { ok: false, reason: "MALFORMED_PAYLOAD", details: { rawEventId: raw.id } };
      }
      const canonical = mapManualWeight(raw, payload);
      if (!canonical) {
        return {
          ok: false,
          reason: "MALFORMED_PAYLOAD",
          details: { rawEventId: raw.id, field: "time" },
        };
      }
      return { ok: true, canonical };
    }

    case "hrv": {
      const payload = parseManualPayload("hrv", raw.payload);
      if (!payload) {
        return { ok: false, reason: "MALFORMED_PAYLOAD", details: { rawEventId: raw.id } };
      }
      const canonical = mapManualHrv(raw, payload);
      if (!canonical) {
        return {
          ok: false,
          reason: "MALFORMED_PAYLOAD",
          details: { rawEventId: raw.id, field: "time" },
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
