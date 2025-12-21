// services/functions/src/validation/rawEvent.ts

import type { RawEvent, CanonicalEventKind, HealthSourceType } from "../types/health";

type ParseOk<T> = { ok: true; value: T };
type ParseFail = { ok: false; reason: string; details?: Record<string, unknown> };
export type ParseResult<T> = ParseOk<T> | ParseFail;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number";

const isIsoDateTimeString = (v: unknown): v is string => {
  if (!isString(v) || v.length === 0) return false;
  return !Number.isNaN(Date.parse(v));
};

const SOURCE_TYPES: readonly HealthSourceType[] = [
  "wearable",
  "mobile_app",
  "manual",
  "lab",
  "device",
  "import",
] as const;

const EVENT_KINDS: readonly CanonicalEventKind[] = ["sleep", "steps", "workout", "weight", "hrv", "nutrition"] as const;

const isHealthSourceType = (v: unknown): v is HealthSourceType =>
  isString(v) && (SOURCE_TYPES as readonly string[]).includes(v);

const isCanonicalEventKind = (v: unknown): v is CanonicalEventKind =>
  isString(v) && (EVENT_KINDS as readonly string[]).includes(v);

export const parseRawEvent = (data: unknown): ParseResult<RawEvent> => {
  if (!isRecord(data)) return { ok: false, reason: "RawEvent is not an object" };

  // Validate required string fields
  const requiredStringKeys = ["id", "userId", "sourceId", "provider", "receivedAt", "observedAt"] as const;

  for (const key of requiredStringKeys) {
    if (!isString(data[key])) {
      return { ok: false, reason: `Missing/invalid ${key}` };
    }
  }

  if (!isHealthSourceType(data["sourceType"])) {
    return { ok: false, reason: "Missing/invalid sourceType" };
  }

  if (!isCanonicalEventKind(data["kind"])) {
    return { ok: false, reason: "Missing/invalid kind" };
  }

  if (!isIsoDateTimeString(data["receivedAt"])) {
    return { ok: false, reason: "Invalid receivedAt (must be ISO datetime string)" };
  }

  if (!isIsoDateTimeString(data["observedAt"])) {
    return { ok: false, reason: "Invalid observedAt (must be ISO datetime string)" };
  }

  if (!isNumber(data["schemaVersion"]) || data["schemaVersion"] !== 1) {
    return { ok: false, reason: "Invalid schemaVersion (must be 1)" };
  }

  // payload is opaque; just require it exists (can be null, but should be present)
  if (!("payload" in data)) {
    return { ok: false, reason: "Missing payload" };
  }

  // Safe cast AFTER runtime validation (via unknown to satisfy TS2352)
  return { ok: true, value: data as unknown as RawEvent };
};
