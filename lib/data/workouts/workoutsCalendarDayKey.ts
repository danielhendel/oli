import type { DayKey } from "@/lib/ui/calendar/types";

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Canonical dayKey derivation using IANA timezone.
 *
 * Mirrors the backend algorithm in mapRawEventToCanonical:
 *   Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(iso))
 */
function ymdInTimeZoneFromIso(iso: string, timeZone: string): DayKey | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone });
    return fmt.format(d) as DayKey;
  } catch {
    return null;
  }
}

export type WorkoutRawForDayDerivation = {
  observedAt: string;
  payload: unknown;
};

/**
 * Derive the canonical day key for a workout-like RawEvent.
 *
 * Precedence (aligned with server mapManualWorkout / window truth: day from occurrence time + TZ):
 * 1. payload.start, startedAt (strength), or payload.time — with payload.timezone or timeZone
 * 2. payload.day when present and valid (YYYY-MM-DD), for legacy / partial payloads without a window
 * 3. observedAt UTC calendar day as a last resort
 */
export function deriveWorkoutDayKey(raw: WorkoutRawForDayDerivation): DayKey | null {
  const payload = isRecord(raw.payload) ? raw.payload : null;

  // 1) Window + timezone (authoritative when present — do not let a stale payload.day override)
  if (payload) {
    const timezone =
      typeof payload.timezone === "string"
        ? (payload.timezone as string)
        : typeof (payload as { timeZone?: unknown }).timeZone === "string"
          ? ((payload as { timeZone: string }).timeZone as string)
          : null;

    if (timezone) {
      const startLike =
        (typeof payload.start === "string" && (payload.start as string)) ||
        (typeof (payload as { startedAt?: unknown }).startedAt === "string"
          ? ((payload as { startedAt: string }).startedAt as string)
          : null) ||
        (typeof (payload as { time?: unknown }).time === "string"
          ? ((payload as { time: string }).time as string)
          : null);

      if (startLike) {
        const fromTz = ymdInTimeZoneFromIso(startLike, timezone);
        if (fromTz) return fromTz;
      }
    }
  }

  // 2) Explicit day when no usable window+timezone
  const payloadDay = payload && typeof payload.day === "string" ? payload.day : null;
  if (payloadDay && YYYY_MM_DD.test(payloadDay)) {
    return payloadDay as DayKey;
  }

  // 3) Fallback: observedAt as UTC day
  if (typeof raw.observedAt === "string") {
    const d = new Date(raw.observedAt);
    if (!Number.isNaN(d.getTime())) {
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const dd = d.getUTCDate();
      const mm = String(m + 1).padStart(2, "0");
      const ddStr = String(dd).padStart(2, "0");
      return `${y}-${mm}-${ddStr}` as DayKey;
    }
  }

  return null;
}

