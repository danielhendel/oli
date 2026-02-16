// services/functions/src/normalization/mapRawEventToCanonical.ts
// -----------------------------------------------------------------------------
// Canonical dayKey derivation
// -----------------------------------------------------------------------------
const toYmdUtc = (date) => {
    const yyyy = String(date.getUTCFullYear()).padStart(4, "0");
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};
/**
 * Canonical dayKey derivation using IANA timezone.
 * Falls back to UTC if timezone is invalid/unavailable.
 *
 * NOTE: uses en-CA format which yields YYYY-MM-DD.
 */
const ymdInTimeZoneFromIso = (iso, timeZone) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
        return toYmdUtc(new Date());
    }
    try {
        const fmt = new Intl.DateTimeFormat("en-CA", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        return fmt.format(d);
    }
    catch {
        return toYmdUtc(d);
    }
};
const MANUAL_KINDS = ["sleep", "steps", "workout", "weight", "hrv"];
const isManualKind = (kind) => MANUAL_KINDS.includes(kind);
const isRecord = (value) => typeof value === "object" && value !== null;
const hasString = (obj, key) => typeof obj[key] === "string";
const hasNumber = (obj, key) => typeof obj[key] === "number";
const isManualWindowBase = (value) => {
    if (!isRecord(value))
        return false;
    return hasString(value, "start") && hasString(value, "end") && hasString(value, "timezone");
};
const isManualSleepPayload = (value) => {
    if (!isRecord(value))
        return false;
    if (!isManualWindowBase(value))
        return false;
    if (!hasNumber(value, "totalMinutes"))
        return false;
    // IMPORTANT: after isManualWindowBase, TS narrows the value to ManualWindowBase.
    // Access extra fields via the record shape (safe runtime check) to satisfy strict TS.
    return typeof value["isMainSleep"] === "boolean";
};
const isManualStepsPayload = (value) => {
    if (!isRecord(value))
        return false;
    if (!isManualWindowBase(value))
        return false;
    return hasNumber(value, "steps");
};
const isManualWorkoutPayload = (value) => {
    if (!isRecord(value))
        return false;
    if (!isManualWindowBase(value))
        return false;
    return hasString(value, "sport") && hasNumber(value, "durationMinutes");
};
const isManualWeightPayload = (value) => {
    if (!isRecord(value))
        return false;
    return hasString(value, "time") && hasString(value, "timezone") && hasNumber(value, "weightKg");
};
const isManualHrvPayload = (value) => {
    if (!isRecord(value))
        return false;
    return hasString(value, "time") && hasString(value, "timezone");
};
/**
 * Parse manual payload based on kind.
 * Constrains K to keyof ManualPayloadByKind to allow indexed access.
 */
const parseManualPayload = (kind, payload) => {
    switch (kind) {
        case "sleep":
            return isManualSleepPayload(payload) ? payload : null;
        case "steps":
            return isManualStepsPayload(payload) ? payload : null;
        case "workout":
            return isManualWorkoutPayload(payload) ? payload : null;
        case "weight":
            return isManualWeightPayload(payload) ? payload : null;
        case "hrv":
            return isManualHrvPayload(payload) ? payload : null;
        default: {
            const _exhaustive = kind;
            return _exhaustive;
        }
    }
};
// -----------------------------------------------------------------------------
// Manual mappers (provider === "manual")
// -----------------------------------------------------------------------------
const mapManualSleep = (raw, payload) => {
    const day = ymdInTimeZoneFromIso(payload.start, payload.timezone);
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
const mapManualSteps = (raw, payload) => {
    const day = ymdInTimeZoneFromIso(payload.start, payload.timezone);
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
const mapManualWorkout = (raw, payload) => {
    const day = ymdInTimeZoneFromIso(payload.start, payload.timezone);
    const base = {
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
    // exactOptionalPropertyTypes-safe: only set when defined
    if (payload.intensity) {
        base.intensity = payload.intensity;
    }
    return base;
};
const mapManualWeight = (raw, payload) => {
    const day = ymdInTimeZoneFromIso(payload.time, payload.timezone);
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
const mapManualHrv = (raw, payload) => {
    const day = ymdInTimeZoneFromIso(payload.time, payload.timezone);
    const base = {
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
    // exactOptionalPropertyTypes-safe: only set when defined
    if (payload.measurementType) {
        base.measurementType = payload.measurementType;
    }
    return base;
};
// -----------------------------------------------------------------------------
// Entry point
// -----------------------------------------------------------------------------
/**
 * Map a RawEvent into a CanonicalEvent.
 *
 * - Currently supports provider === "manual".
 * - Other providers (e.g. "apple_health", "oura") will be added later.
 */
export const mapRawEventToCanonical = (raw) => {
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
    // Parse INSIDE each case so the payload is correctly typed per-kind
    // (avoids union payload issues under strict TS).
    switch (raw.kind) {
        case "sleep": {
            const payload = parseManualPayload("sleep", raw.payload);
            if (!payload) {
                return {
                    ok: false,
                    reason: "MALFORMED_PAYLOAD",
                    details: { provider: raw.provider, kind: raw.kind, rawEventId: raw.id },
                };
            }
            return { ok: true, canonical: mapManualSleep(raw, payload) };
        }
        case "steps": {
            const payload = parseManualPayload("steps", raw.payload);
            if (!payload) {
                return {
                    ok: false,
                    reason: "MALFORMED_PAYLOAD",
                    details: { provider: raw.provider, kind: raw.kind, rawEventId: raw.id },
                };
            }
            return { ok: true, canonical: mapManualSteps(raw, payload) };
        }
        case "workout": {
            const payload = parseManualPayload("workout", raw.payload);
            if (!payload) {
                return {
                    ok: false,
                    reason: "MALFORMED_PAYLOAD",
                    details: { provider: raw.provider, kind: raw.kind, rawEventId: raw.id },
                };
            }
            return { ok: true, canonical: mapManualWorkout(raw, payload) };
        }
        case "weight": {
            const payload = parseManualPayload("weight", raw.payload);
            if (!payload) {
                return {
                    ok: false,
                    reason: "MALFORMED_PAYLOAD",
                    details: { provider: raw.provider, kind: raw.kind, rawEventId: raw.id },
                };
            }
            return { ok: true, canonical: mapManualWeight(raw, payload) };
        }
        case "hrv": {
            const payload = parseManualPayload("hrv", raw.payload);
            if (!payload) {
                return {
                    ok: false,
                    reason: "MALFORMED_PAYLOAD",
                    details: { provider: raw.provider, kind: raw.kind, rawEventId: raw.id },
                };
            }
            return { ok: true, canonical: mapManualHrv(raw, payload) };
        }
        default: {
            const _exhaustive = raw.kind;
            return _exhaustive;
        }
    }
};
