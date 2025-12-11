// services/functions/src/types/health.ts

/**
 * Oli Health OS — Canonical Schema v1 (Sprint 2 + Sprint 5 extensions)
 *
 * These types are:
 * - Storage-agnostic (no Firestore/Admin types)
 * - Deterministic shapes for the Event → Fact → Insight pipeline
 * - Shared across ingestion, normalization, analytics, and API layers
 *
 * All timestamps are ISO 8601 strings in UTC.
 * All dates are YYYY-MM-DD in the user’s logical day.
 */

/** Example: "2025-01-01T06:30:00.000Z" */
export type IsoDateTimeString = string;

/** Example: "2025-01-01" */
export type YmdDateString = string;

/**
 * High-level source classification.
 * This matches the ingestion / OS design in the Master System Architecture.
 */
export type HealthSourceType =
  | 'wearable'
  | 'mobile_app'
  | 'manual'
  | 'lab'
  | 'device'
  | 'import';

/**
 * Core canonical event kinds for v1.
 * Sprint 2 focuses on the body + training stack:
 * - Sleep
 * - Steps / activity
 * - Workouts
 * - Weight
 * - HRV / recovery
 */
export type CanonicalEventKind =
  | 'sleep'
  | 'steps'
  | 'workout'
  | 'weight'
  | 'hrv';

/**
 * RawEvent is the ingestion boundary type.
 * It represents the un-normalized payload from each upstream source,
 * tagged with enough metadata to safely reprocess later.
 *
 * Firestore path (logical):
 *   /users/{userId}/rawEvents/{rawEventId}
 */
export interface RawEvent {
  /** Unique ID at ingestion-time (document id) */
  id: string;

  /** User this event belongs to */
  userId: string;

  /** Logical source ID (per-user source document id) */
  sourceId: string;

  /** High-level source classification (wearable, manual, etc.) */
  sourceType: HealthSourceType;

  /** Provider identifier (e.g. "apple_health", "oura", "manual") */
  provider: string;

  /** Target canonical event kind this raw payload contributes to */
  kind: CanonicalEventKind;

  /** When Oli received this event (server time, ISO-8601 UTC) */
  receivedAt: IsoDateTimeString;

  /** When the underlying event actually occurred (provider time, normalized to UTC) */
  observedAt: IsoDateTimeString;

  /**
   * Provider-specific payload. Deliberately opaque at this layer.
   * Normalization logic will decode this into CanonicalEvent values.
   */
  payload: unknown;

  /**
   * Schema version for the raw event envelope.
   * Allows forward-compatible migrations of ingestion format.
   */
  schemaVersion: 1;
}

/**
 * Base shape shared by all canonical event types.
 *
 * Firestore path (logical):
 *   /users/{userId}/events/{canonicalEventId}
 */
export interface BaseCanonicalEvent {
  /** Unique ID (document id) */
  id: string;

  /** User this event belongs to */
  userId: string;

  /** Logical source ID that produced this event */
  sourceId: string;

  /** Discriminant for the union of canonical events */
  kind: CanonicalEventKind;

  /**
   * Start of the event window (ISO-8601 UTC)
   * Example: start of sleep episode, workout, etc.
   */
  start: IsoDateTimeString;

  /**
   * End of the event window (ISO-8601 UTC)
   */
  end: IsoDateTimeString;

  /** Logical day we attribute this event to (YYYY-MM-DD in user’s local zone) */
  day: YmdDateString;

  /** User’s time zone at the time of the event (IANA string, e.g. "America/New_York") */
  timezone: string;

  /** Audit fields */
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;

  /** Schema version for the canonical event envelope */
  schemaVersion: 1;
}

/**
 * SleepCanonicalEvent — normalized sleep episode.
 */
export interface SleepCanonicalEvent extends BaseCanonicalEvent {
  kind: 'sleep';

  /** Total minutes asleep during this episode */
  totalMinutes: number;

  /** Optional sleep efficiency (0–1) */
  efficiency?: number | null;

  /** Time between attempting sleep and actual sleep onset */
  latencyMinutes?: number | null;

  /** Number of awakenings during the episode */
  awakenings?: number | null;

  /** Whether this is the primary/main sleep for the day */
  isMainSleep: boolean;
}

/**
 * StepsCanonicalEvent — steps / incidental activity over a window.
 */
export interface StepsCanonicalEvent extends BaseCanonicalEvent {
  kind: 'steps';

  /** Total steps in this window */
  steps: number;

  /** Optional travel distance in km */
  distanceKm?: number | null;

  /** Minutes the user was in "move" / active state */
  moveMinutes?: number | null;
}

/**
 * WorkoutCanonicalEvent — explicit workouts / training sessions.
 */
export interface WorkoutCanonicalEvent extends BaseCanonicalEvent {
  kind: 'workout';

  /** Free-form sport name (e.g. "run", "cycling", "strength_training") */
  sport: string;

  /** Coarse-grained intensity bucket */
  intensity?: 'easy' | 'moderate' | 'hard';

  /** Workout duration in minutes */
  durationMinutes: number;

  /** Optional training load / strain metric (provider-agnostic scalar) */
  trainingLoad?: number | null;
}

/**
 * WeightCanonicalEvent — body weight & composition measurements.
 */
export interface WeightCanonicalEvent extends BaseCanonicalEvent {
  kind: 'weight';

  /** Body weight in kilograms */
  weightKg: number;

  /** Optional body fat percentage (0–100) */
  bodyFatPercent?: number | null;
}

/**
 * HrvCanonicalEvent — HRV / recovery markers.
 */
export interface HrvCanonicalEvent extends BaseCanonicalEvent {
  kind: 'hrv';

  /** Root-mean-square of successive differences (ms) */
  rmssdMs?: number | null;

  /** Standard deviation of NN intervals (ms) */
  sdnnMs?: number | null;

  /** Whether this was a nightly aggregated measurement or spot check */
  measurementType?: 'nightly' | 'spot';
}

/**
 * Discriminated union of all canonical events.
 * This is the primary event type used by the normalization layer.
 */
export type CanonicalEvent =
  | SleepCanonicalEvent
  | StepsCanonicalEvent
  | WorkoutCanonicalEvent
  | WeightCanonicalEvent
  | HrvCanonicalEvent;

/**
 * DailyFacts — per-day rollups produced from CanonicalEvents.
 *
 * Firestore path (logical):
 *   /users/{userId}/dailyFacts/{yyyy-MM-dd}
 */
export interface DailySleepFacts {
  totalMinutes?: number;
  mainSleepMinutes?: number;
  efficiency?: number;
  latencyMinutes?: number;
  awakenings?: number;
}

export interface DailyActivityFacts {
  steps?: number;
  distanceKm?: number;
  moveMinutes?: number;
  trainingLoad?: number;

  /**
   * Sprint 5 — Precision features:
   * 7-day rolling averages for movement / training load.
   */
  stepsAvg7d?: number;
  trainingLoadAvg7d?: number;
}

export interface DailyRecoveryFacts {
  hrvRmssd?: number;
  restingHeartRate?: number;
  readinessScore?: number;

  /**
   * Sprint 5 — Precision features:
   * Baseline + relative deviation for HRV.
   *
   * - hrvRmssdBaseline: 7-day average (or similar) of HRV RMSSD.
   * - hrvRmssdDeviation: (today - baseline) / baseline, e.g. -0.2 = 20% below.
   */
  hrvRmssdBaseline?: number;
  hrvRmssdDeviation?: number;
}

export interface DailyBodyFacts {
  weightKg?: number;
  bodyFatPercent?: number;
}

/**
 * Sprint 5 — Domain-level confidence scores for DailyFacts.
 * Values are 0–1, where:
 * - 0 means "no confidence / essentially missing"
 * - 1 means "high confidence / strong sensor coverage"
 */
export interface DailyDomainConfidence {
  sleep?: number;
  activity?: number;
  recovery?: number;
  body?: number;
}

export interface DailyFacts {
  /** User this document belongs to */
  userId: string;

  /** Logical day: YYYY-MM-DD in the user’s local zone */
  date: YmdDateString;

  /** Domain-specific rollups */
  sleep?: DailySleepFacts;
  activity?: DailyActivityFacts;
  recovery?: DailyRecoveryFacts;
  body?: DailyBodyFacts;

  /**
   * Domain-level confidence for this day's facts (0–1).
   * All fields are optional to keep v1 backwards-compatible.
   */
  confidence?: DailyDomainConfidence;

  /** Schema + compute audit */
  schemaVersion: 1;
  computedAt: IsoDateTimeString;
}

/**
 * Insight — output of the Intelligence layer.
 *
 * Firestore path (logical):
 *   /users/{userId}/insights/{insightId}
 */
export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface InsightEvidencePoint {
  /** Path into DailyFacts or CanonicalEvents that this insight is based on */
  factPath: string; // e.g. "sleep.totalMinutes" or "activity.steps"

  /** Actual value observed */
  value: number | string | boolean | null;

  /** Threshold used to trigger the rule (if applicable) */
  threshold?: number;

  /** Direction of the comparison that triggered the rule */
  direction?: 'above' | 'below' | 'outside_range';
}

export interface Insight {
  /** Unique insight id (document id) */
  id: string;

  /** Target user */
  userId: string;

  /** Logical day this insight is attached to (YYYY-MM-DD) */
  date: YmdDateString;

  /**
   * Machine-friendly kind identifier.
   * Example: "low_sleep_duration", "high_training_load"
   */
  kind: string;

  /** Human-friendly title and body copy for the user */
  title: string;
  message: string;

  /** Severity bucket used for prioritization and UI treatment */
  severity: InsightSeverity;

  /** Evidence backing this insight, for auditability and explainability */
  evidence: InsightEvidencePoint[];

  /** Optional tags used for filtering and grouping in the UI */
  tags?: string[];

  /** Audit + versioning fields */
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;

  /**
   * Version of the ruleset / engine that produced this insight.
   * Example: "sleep-v1.0.0"
   */
  ruleVersion: string;

  /** Schema version for the Insight document */
  schemaVersion: 1;
}

/**
 * UserSourceConnection — links a user to a specific upstream provider.
 *
 * Firestore path (logical):
 *   /users/{userId}/sources/{sourceId}
 */
export type SourceStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'revoked';

export interface UserSourceConnection {
  /** Document id (sourceId) */
  id: string;

  /** Owner user id */
  userId: string;

  /** High-level source classification (wearable, manual, etc.) */
  sourceType: HealthSourceType;

  /** Provider identifier (e.g. "apple_health", "oura", "strava") */
  provider: string;

  /** Human-friendly name shown in UI  */
  displayName?: string;

  /** Current connection status */
  status: SourceStatus;

  /** Granted scopes / capabilities for this connection */
  scopes?: string[];

  /** Last attempted sync time (success or failure) */
  lastSyncAt?: IsoDateTimeString | null;

  /** Last successful sync time (for idempotent backfills) */
  lastSuccessfulSyncAt?: IsoDateTimeString | null;

  /** Last error code/message (if status === "error") */
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;

  /**
   * Provider-specific configuration (tokens, ids, etc.).
   * Kept opaque at the schema layer; concrete types live in integration modules.
   */
  config?: Record<string, unknown>;

  /** Audit fields */
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;

  /** Schema version for the UserSourceConnection document */
  schemaVersion: 1;
}

/**
 * Narrow helper utilities — lightweight runtime guards
 * to keep pipeline transitions type-safe.
 */

/** Returns true if the given string matches YYYY-MM-DD. */
export function isYmdDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Type guard to distinguish CanonicalEvent from RawEvent based on
 * the presence of canonical-only fields.
 */
export function isCanonicalEvent(
  event: CanonicalEvent | RawEvent
): event is CanonicalEvent {
  const candidate = event as CanonicalEvent;
  return (
    typeof candidate.kind === 'string' &&
    typeof (candidate as { start?: unknown }).start === 'string'
  );
}

/** Minimal runtime check for DailyFacts shape */
export function isDailyFacts(value: unknown): value is DailyFacts {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as DailyFacts;
  return (
    typeof candidate.userId === 'string' &&
    typeof candidate.date === 'string'
  );
}
