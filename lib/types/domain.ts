// lib/types/domain.ts
/**
 * Oli Domain Types — Events → Facts → Insights backbone.
 * Matches Firestore paths:
 *   /users/{uid}
 *   /users/{uid}/events/{autoId}
 *   /users/{uid}/facts/{factId}
 *
 * Daily facts follow kind/id "daily.summary.v1:<YYYY-MM-DD>" and events include ymd.
 */

/////// Common primitives

/** YYYY-MM-DD (UTC) */
export type YMD = `${number}-${number}-${number}`;

/** Firestore timestamp (read) shape or Date for app-side convenience */
export type FsTimestamp = Date | { seconds: number; nanoseconds: number };

/** Versioning for envelopes (append-only evolution) */
export type Version = 1;

/** Event source taxonomy (import:* reserved for server writers) */
export type EventSource =
  | "manual"
  | "template"
  | "past"
  | "import:oura"
  | "import:withings"
  | "import:apple";

/** Optional meta block carried on events */
export type EventMeta = {
  source: EventSource;
  draft?: boolean;
  createdAt?: FsTimestamp;
  editedAt?: FsTimestamp;
  idempotencyKey?: string;
};

/////// User profile

export type UnitSystem = "metric" | "imperial";

export type IntegrationStatus = "connected" | "disconnected" | "error";

export type IntegrationInfo = {
  status: IntegrationStatus;
  connectedAt?: FsTimestamp;
  lastSyncAt?: FsTimestamp;
  lastError?: { code?: string; message?: string };
  // No secrets/tokens live in Firestore user docs.
};

export type UserPreferences = {
  units?: UnitSystem;
  timezone?: string;
  shareData?: boolean;
  devicesAllowed?: string[]; // e.g. ["oura","withings"]
};

export type UserGoals = {
  primaryGoal?: string;
  targetBodyFatPct?: number;
  weeklyWorkoutFrequency?: number;
};

export type UserProfile = {
  uid: string;
  name?: string;
  dob?: string; // ISO date
  sex?: "male" | "female" | "other";
  heightCm?: number;
  weightKg?: number;

  preferences?: UserPreferences;
  goals?: UserGoals;

  // Per-provider integration status (no secrets)
  integrations?: Record<string, IntegrationInfo>;

  createdAt?: FsTimestamp;
  updatedAt?: FsTimestamp;
};

/////// Events (append-only)

export type EventType =
  | "workout"
  | "cardio"
  | "nutrition"
  | "recovery"
  | "measurement"
  | "sleep"
  | "file_upload";

/** Base event envelope shared by all kinds */
export type BaseEvent = {
  uid: string;
  type: EventType;
  ts?: FsTimestamp; // server timestamp on write
  version: Version;
  source: EventSource;
  ymd: YMD; // required for rollups and fast daily queries
  meta?: EventMeta;
};

/** Payloads by event kind */

// — workout
export type WorkoutSet = { reps: number; weight?: number; rir?: number };
export type WorkoutExercise = { name: string; sets: WorkoutSet[] };
export type WorkoutPayload = {
  name?: string;
  focusAreas?: string[];
  durationMin?: number;
  exercises?: WorkoutExercise[];
  notes?: string;
};
export type WorkoutEvent = BaseEvent & { type: "workout"; payload: WorkoutPayload };

// — cardio
export type CardioPayload = {
  modality: "run" | "bike" | "row" | "swim" | "walk" | (string & {});
  distanceKm?: number;
  durationMin?: number;
  avgHr?: number;
  notes?: string;
};
export type CardioEvent = BaseEvent & { type: "cardio"; payload: CardioPayload };

// — nutrition
export type NutritionItem = {
  name: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
};
export type NutritionPayload = {
  items: NutritionItem[];
  meal?: "breakfast" | "lunch" | "dinner" | "snack";
  notes?: string;
};
export type NutritionEvent = BaseEvent & { type: "nutrition"; payload: NutritionPayload };

// — recovery
export type RecoveryPayload = {
  modality:
    | "sauna"
    | "cold"
    | "mobility"
    | "massage"
    | "nap"
    | (string & {});
  durationMin?: number;
  perceivedRecoveryScore?: number; // 1-10
  notes?: string;
};
export type RecoveryEvent = BaseEvent & { type: "recovery"; payload: RecoveryPayload };

// — measurement (generic single metric capture)
export type MeasurementPayload = {
  metric:
    | "body_weight_kg"
    | "body_fat_pct"
    | "hr_rest"
    | "hrv_rmssd"
    | "blood_pressure"
    | (string & {});
  value?: number | { systolic: number; diastolic: number };
  notes?: string;
};
export type MeasurementEvent = BaseEvent & {
  type: "measurement";
  payload: MeasurementPayload;
};

// — sleep
export type SleepStage = { start: string; end: string; stage?: string };
export type SleepPayload = {
  totalMin?: number;
  stages?: SleepStage[];
  score?: number;
  notes?: string;
};
export type SleepEvent = BaseEvent & { type: "sleep"; payload: SleepPayload };

// — file upload
export type FileUploadPayload = {
  storagePath: string; // gs://… or /bucket/key
  fileType?: "pdf" | "image" | "csv" | "other";
  label?: string;
  notes?: string;
};
export type FileUploadEvent = BaseEvent & {
  type: "file_upload";
  payload: FileUploadPayload;
};

/** Discriminated union of all event kinds */
export type Event =
  | WorkoutEvent
  | CardioEvent
  | NutritionEvent
  | RecoveryEvent
  | MeasurementEvent
  | SleepEvent
  | FileUploadEvent;

/**
 * EventDoc — shape returned by list/read operations when you also include the Firestore doc ID.
 * (Some hooks/components expect an `id` alongside the event data.)
 */
export type EventDoc = Event & { id: string };

/**
 * NewEvent — write shape for creating events.
 * Omit server-managed fields (`ts`, `version`) up front; allow caller to provide uid (or set it in the caller).
 * We keep strict payload typing via the same discriminated union.
 */
type NewBaseEvent = Omit<BaseEvent, "ts" | "version">;

export type NewWorkoutEvent = NewBaseEvent & { type: "workout"; payload: WorkoutPayload };
export type NewCardioEvent = NewBaseEvent & { type: "cardio"; payload: CardioPayload };
export type NewNutritionEvent = NewBaseEvent & { type: "nutrition"; payload: NutritionPayload };
export type NewRecoveryEvent = NewBaseEvent & { type: "recovery"; payload: RecoveryPayload };
export type NewMeasurementEvent = NewBaseEvent & { type: "measurement"; payload: MeasurementPayload };
export type NewSleepEvent = NewBaseEvent & { type: "sleep"; payload: SleepPayload };
export type NewFileUploadEvent = NewBaseEvent & { type: "file_upload"; payload: FileUploadPayload };

export type NewEvent =
  | NewWorkoutEvent
  | NewCardioEvent
  | NewNutritionEvent
  | NewRecoveryEvent
  | NewMeasurementEvent
  | NewSleepEvent
  | NewFileUploadEvent;

/////// Facts (derived summaries)

export type DailySummaryValue = {
  workouts: number;
  cardioSessions: number;
  nutritionLogs: number;
  recoveryLogs: number;
};

export type FactBase<T = unknown> = {
  uid: string;
  kind: string; // e.g., "daily.summary.v1"
  date: YMD;
  value: T;
  version: Version;
  source: "derived" | "manual" | (string & {});
  ts?: FsTimestamp;
};

export type DailySummaryFact = FactBase<DailySummaryValue> & {
  kind: "daily.summary.v1";
};

export type Fact<T = unknown> = FactBase<T>;

export type NewFact<T = unknown> = Omit<
  FactBase<T>,
  "uid" | "version" | "ts" | "source"
> & {
  ts?: FsTimestamp;
  source?: FactBase["source"];
};
