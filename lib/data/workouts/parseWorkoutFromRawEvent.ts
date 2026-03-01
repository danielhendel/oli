import type { RawEventDoc } from "@oli/contracts";

export type WorkoutHistoryItem = {
  id: string;
  observedAt: string;
  sourceId: string;
  title: string;
  start: string | null;
  end: string | null;
  durationMinutes: number | null;
  calories: number | null;
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

  const start = asString(payload?.start) ?? asString(raw.observedAt) ?? null;
  const end = asString(payload?.end) ?? null;

  const title =
    asString(payload?.sport) ??
    asString(payload?.activityName) ??
    "Workout";

  const durationMinutes =
    asNumber(payload?.durationMinutes) ??
    (asNumber(payload?.duration) != null
      ? Math.round((asNumber(payload?.duration) ?? 0) / 60)
      : null);

  const calories = asNumber(payload?.calories) ?? null;

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
    start,
    end,
    durationMinutes,
    calories,
    ...(hk ? { hk } : {}),
  };
}
