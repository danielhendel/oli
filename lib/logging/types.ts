// lib/logging/types.ts
// Central UI + data types used by logging hooks/components.

// Keep this local to avoid circular deps on schemas; it must mirror your event kinds.
export type EventType = "workout" | "cardio" | "nutrition" | "recovery";

/** Firestore event document (minimal shape we depend on in UI). */
export type EventDoc = {
  id: string;
  uid: string;
  type: EventType;
  version: 1;
  source: string;
  ts?: unknown;       // Firestore Timestamp-like (toMillis | seconds/nanoseconds)
  payload: unknown;   // Validated elsewhere (schemas/validation layer)
};

/** Row used by DayList and day-detail screens. */
export type UIEvent = {
  id: string;
  time: string;
  title: string;
  // NOTE: with exactOptionalPropertyTypes enabled, if you *include* subtitle it must be a string (not undefined).
  // Only add the property when you have a value.
  subtitle?: string;
  type: EventType;
  raw: EventDoc;
};
