import type { RawEventDoc } from "@oli/contracts";
import { classifyWorkoutType } from "@/lib/data/workouts/workoutMarkerFlags";

/** Best-effort minutes per zone (1–5) when present on raw payload; not part of strict ingest schema. */
export type HeartRateZoneMinutes5 = readonly [number, number, number, number, number];

export type WorkoutHistoryItem = {
  id: string;
  observedAt: string;
  sourceId: string;
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
export function parseWorkoutHistoryItem(raw: RawEventDoc): WorkoutHistoryItem {
  const id = raw.id;
  const observedAt = raw.observedAt ?? raw.receivedAt;
  const sourceId = raw.sourceId ?? "unknown";

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
  if (raw.kind === "strength_workout" && payload && Array.isArray((payload as { exercises?: unknown }).exercises)) {
    const exs = (payload as { exercises: { name?: unknown }[] }).exercises;
    const first = exs[0];
    const exName = first && typeof first.name === "string" ? first.name.trim() : "";
    title = exName.length > 0 ? exName : "Strength workout";
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

  return {
    id,
    observedAt,
    sourceId,
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
  };
}
