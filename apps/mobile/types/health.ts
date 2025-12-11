// apps/mobile/types/health.ts

/**
 * Mobile-side mirror of core health types used for ingestion.
 * These are intentionally minimal and must stay in sync with the
 * backend canonical schema.
 */

export type IsoDateTimeString = string;

export type CanonicalEventKind =
  | "sleep"
  | "steps"
  | "workout"
  | "weight"
  | "hrv";
