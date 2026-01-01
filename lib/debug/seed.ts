// lib/debug/seed.ts
import { apiPostJsonAuthed, type JsonValue } from "../api/http";
import { getIdToken } from "../auth/getIdToken";
import { getTodayDayKey } from "../time/dayKey";

const asRecord = (v: JsonValue | undefined): Record<string, JsonValue> | null => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, JsonValue>;
};

const findFirstString = (obj: Record<string, JsonValue> | null, keys: string[]): string | undefined => {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
};

export type SeedResult = {
  ok: true;
  rawEventId?: string;
  response: JsonValue;
};

export const seedTodayWeight = async (): Promise<SeedResult> => {
  const token = await getIdToken();
  const day = getTodayDayKey();
  const now = new Date().toISOString();

  const body = {
    provider: "manual",
    kind: "weight",
    observedAt: now,
    payload: {
      day,
      time: now,
      timezone: "America/New_York",
      weightKg: 80,
      clientSeedKey: `seed-weight-${day}`,
    },
  };

  const res = await apiPostJsonAuthed<JsonValue>("/ingest/events", body, token, {
    idempotencyKey: `seed-weight-${day}`,
  });

  if (!res.ok) throw new Error(res.error);

  const obj = asRecord(res.json);

  const rawEventId =
    findFirstString(obj, ["rawEventId", "id", "eventId"]) ??
    findFirstString(asRecord(obj?.result), ["rawEventId", "id", "eventId"]) ??
    findFirstString(asRecord(obj?.data), ["rawEventId", "id", "eventId"]);

  return { ok: true, ...(rawEventId ? { rawEventId } : {}), response: res.json };
};
