// lib/contracts/rawEvent.ts
import { z } from "zod";
import { dayKeySchema } from "./day";

// -----------------------------
// Primitives
// -----------------------------

export const ymdDateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid YYYY-MM-DD");

export const isoDateTimeStringSchema = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid ISO datetime string");

// NOTE: Keep provider/sourceType flexible for future integrations,
// but keep the *payload+kind* strict to what Functions + Phase 1 support today.
export const rawEventSchemaVersionSchema = z.literal(1);

/**
 * Phase 2 — Uncertainty state at event level.
 * Must be visible at event/day/timeline. Never silently upgraded.
 */
export const uncertaintyStateSchema = z.enum(["complete", "incomplete", "uncertain"]);
export type UncertaintyState = z.infer<typeof uncertaintyStateSchema>;

/**
 * Phase 2 — Provenance/source of the event.
 * Backfill = logged after the fact; recordedAt differs from occurredAt.
 */
export const provenanceSchema = z.enum(["manual", "device", "upload", "backfill", "correction"]);
export type Provenance = z.infer<typeof provenanceSchema>;

/**
 * Phase 2 — occurredAt: exact ISO datetime OR time window/range.
 * Never fake precision. Approximate time remains visible as approximate.
 */
export const occurredAtExactSchema = isoDateTimeStringSchema;
export const occurredAtRangeSchema = z
  .object({
    start: isoDateTimeStringSchema,
    end: isoDateTimeStringSchema,
  })
  .strip()
  .refine((r) => Date.parse(r.start) <= Date.parse(r.end), {
    message: "Range start must be <= end",
  });
export const occurredAtSchema = z.union([occurredAtExactSchema, occurredAtRangeSchema]);
export type OccurredAt = z.infer<typeof occurredAtSchema>;

/**
 * Phase 2 — recordedAt: exact ISO datetime when the event was logged.
 * For backfill: recordedAt = now, occurredAt = past.
 */
export const recordedAtSchema = isoDateTimeStringSchema;

/**
 * RawEvent kinds are the ingestion boundary taxonomy.
 *
 * Phase 1 rule:
 * - Canonical kinds exist here (sleep/steps/...)
 * - "file" is memory-only (upload artifact), not canonical, not normalized yet.
 *
 * Phase 2:
 * - "incomplete" is memory-only: "something happened, details later".
 */
export const rawEventKindSchema = z.enum([
  "sleep",
  "steps",
  "workout",
  "weight",
  "body_composition",
  "hrv",
  "nutrition",
  "strength_workout",
  "workout_title_override",
  "file",
  "incomplete",
  "oura_raw",
]);

/**
 * POST /ingest accepted response (shared by weight, strength_workout, etc.)
 */
export const ingestAcceptedResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    rawEventId: z.string().min(1),
    day: dayKeySchema.optional(),
    idempotentReplay: z.literal(true).optional(),
    /** Set when an existing apple_health workout doc had distanceMeters added without creating a duplicate. */
    payloadEnriched: z.literal(true).optional(),
    /**
     * Apple Health workout was not written because this idempotency key was suppressed after the user
     * removed the workout from Oli (DELETE /ingest), blocking HealthKit re-sync from resurrecting it.
     */
    ingestSuppressed: z.literal(true).optional(),
  })
  .strip();

export type IngestAcceptedResponseDto = z.infer<typeof ingestAcceptedResponseDtoSchema>;

/**
 * DELETE /ingest/:rawEventId — successful removal of an ingested RawEvent (manual workouts only; server-enforced).
 * `suppressionWritten` is true when an Apple Health v2 workout tombstone was persisted at
 * `users/{uid}/rawEventIngestSuppressions/{rawEventId}` (blocks re-ingest); false when not applicable (e.g. manual id).
 *
 * `requestId` may be omitted in some proxy paths; clients fall back to the `x-request-id` header (see lib/api/ingest.ts).
 */
export const deleteRawEventResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    rawEventId: z.string().min(1),
    requestId: z.string().min(1).optional().nullable(),
    suppressionWritten: z.boolean(),
  })
  .strip()
  .transform((o) => ({
    ok: true as const,
    rawEventId: o.rawEventId,
    requestId:
      o.requestId != null && String(o.requestId).trim().length > 0
        ? String(o.requestId).trim()
        : "unknown",
    suppressionWritten: o.suppressionWritten,
  }));

export type DeleteRawEventResponseDto = z.infer<typeof deleteRawEventResponseDtoSchema>;

/** HTTP 404 body from DELETE /ingest/:rawEventId (doc already absent; may still write suppression). */
export const deleteRawEventDelete404ResponseBodySchema = z
  .object({
    ok: z.literal(false),
    error: z
      .object({
        code: z.string(),
        message: z.string().optional(),
      })
      .optional(),
    requestId: z.string(),
    suppressionWritten: z.boolean(),
  })
  .strip();

export type DeleteRawEventDelete404ResponseBody = z.infer<typeof deleteRawEventDelete404ResponseBodySchema>;

// -----------------------------
// Payloads
// -----------------------------

const manualWindowBaseSchema = z
  .object({
    start: isoDateTimeStringSchema,
    end: isoDateTimeStringSchema,
    timezone: z.string().min(1),
    // day is optional; server derives dayKey canonically, but we may store it for convenience/backcompat
    day: ymdDateStringSchema.optional(),
  })
  .strip();

// Manual payloads (canonicalizable)
const manualSleepPayloadSchema = manualWindowBaseSchema
  .extend({
    totalMinutes: z.number().finite().nonnegative(),
    efficiency: z.number().finite().min(0).max(1).nullable().optional(),
    latencyMinutes: z.number().finite().nonnegative().nullable().optional(),
    awakenings: z.number().finite().nonnegative().nullable().optional(),
    isMainSleep: z.boolean(),
    /** Derived from vendor stage durations when available; minutes in-sleep */
    remSleepMinutes: z.number().finite().nonnegative().nullable().optional(),
    deepSleepMinutes: z.number().finite().nonnegative().nullable().optional(),
  })
  .strip();

const manualStepsPayloadSchema = manualWindowBaseSchema
  .extend({
    steps: z.number().finite().nonnegative(),
    distanceKm: z.number().finite().nonnegative().nullable().optional(),
    moveMinutes: z.number().finite().nonnegative().nullable().optional(),
    /** Preferred stable HealthKit / Apple sample identity (additive). */
    sourceSampleId: z.string().min(1).max(512).optional(),
    /** Alias accepted from some clients; normalized to canonical `sourceSampleId` in the mapper. */
    sampleId: z.string().min(1).max(512).optional(),
    sourceUUID: z.string().min(1).max(512).optional(),
  })
  .strip();

/**
 * Workout Physiology v1 — heart-rate zone basis stamp.
 *
 * Identifies which threshold model produced `heartRateZoneMinutes`.
 * Phase B ships `default_thresholds_v1` only; future personalized models
 * (e.g. user max-HR based) will add new modelVersion strings without changing
 * this schema shape (additive enum extension).
 *
 * Invariants:
 * - `thresholdsBpm` is the ascending z1/z2, z2/z3, z3/z4, z4/z5 cutoff vector.
 * - `userMaxHrBpm` is null when zones are computed from defaults (no personalized max-HR).
 * - `computedFromSampleCount` is the HR sample count used to compute the zone tuple.
 */
const workoutHeartRateZoneBasisSchema = z
  .object({
    modelVersion: z.enum(["default_thresholds_v1"]),
    thresholdsBpm: z
      .tuple([
        z.number().finite().positive(),
        z.number().finite().positive(),
        z.number().finite().positive(),
        z.number().finite().positive(),
      ])
      .refine(
        ([a, b, c, d]) => a < b && b < c && c < d,
        { message: "thresholdsBpm must be strictly ascending" },
      ),
    userMaxHrBpm: z.number().finite().positive().nullable(),
    computedFromSampleCount: z.number().int().nonnegative(),
  })
  .strip();

/**
 * Workout Physiology v1 — post-workout heart-rate recovery probe.
 *
 * Queried over `[end, end + windowSeconds]` independently of summary HR.
 * Phase B uses windowSeconds = 120 (standard 2-minute HRR).
 *
 * Invariants:
 * - `dropBpm = startBpm - endBpm`. May be negative if HR continued to climb.
 * - Block is omitted from the payload when `sampleCount === 0`.
 */
const workoutPostWorkoutHeartRateSchema = z
  .object({
    windowSeconds: z.number().int().positive(),
    startBpm: z.number().finite().positive(),
    endBpm: z.number().finite().positive(),
    dropBpm: z.number().finite(),
    sampleCount: z.number().int().nonnegative(),
  })
  .strip();

const manualWorkoutPayloadSchema = manualWindowBaseSchema
  .extend({
    sport: z.string().min(1),
    intensity: z.enum(["easy", "moderate", "hard"]).optional(),
    durationMinutes: z.number().finite().positive(),
    trainingLoad: z.number().finite().nonnegative().nullable().optional(),
    /** Apple Health / device-ingested cardio distance (meters); optional for manual-only payloads. */
    distanceMeters: z.number().finite().positive().optional(),
    averageHeartRateBpm: z.number().finite().positive().optional(),
    maxHeartRateBpm: z.number().finite().positive().optional(),
    /**
     * Legacy active-calorie field; populated by every Apple Health workout ingest since launch.
     * Readers must prefer `activeEnergyKcal` when present and fall back to this.
     */
    calories: z.number().finite().nonnegative().optional(),
    /**
     * Phase 2A — Workout-level step total for the workout window (HealthKit cumulative sum over
     * `[start, end]` or other provider-supplied per-workout step count). Drives Activity step
     * allocation in `DailyFacts.activity.stepsAllocation`; never invented client-side.
     */
    steps: z.number().finite().nonnegative().optional(),
    /**
     * Workout Physiology v1 — explicit active energy (kcal) summed over `[start, end]`.
     * Distinct from legacy `calories` so future readers can disambiguate.
     */
    activeEnergyKcal: z.number().finite().nonnegative().optional(),
    /**
     * Workout Physiology v1 — basal energy (kcal) summed over `[start, end]`.
     * Stored for forensics; NOT aggregated into DailyFacts in Phase B (basal over a workout
     * window is a partial-day estimate).
     */
    basalEnergyKcal: z.number().finite().nonnegative().optional(),
    /**
     * Workout Physiology v1 — total energy (kcal) = active + basal when both available.
     * Server may cross-check `active + basal ≈ total` with ±0.5 kcal tolerance.
     */
    totalEnergyKcal: z.number().finite().nonnegative().optional(),
    /**
     * Workout Physiology v1 — minutes in each HR zone (z1..z5).
     * Computed from padded HR samples clipped to strict `[start, end]`.
     * MUST be accompanied by `heartRateZoneBasis` when present.
     */
    heartRateZoneMinutes: z
      .tuple([
        z.number().finite().nonnegative(),
        z.number().finite().nonnegative(),
        z.number().finite().nonnegative(),
        z.number().finite().nonnegative(),
        z.number().finite().nonnegative(),
      ])
      .optional(),
    /** See {@link workoutHeartRateZoneBasisSchema}. */
    heartRateZoneBasis: workoutHeartRateZoneBasisSchema.optional(),
    /** See {@link workoutPostWorkoutHeartRateSchema}. */
    postWorkoutHeartRate: workoutPostWorkoutHeartRateSchema.optional(),
    /** Workout Physiology v1 — stamps the enrichment pipeline that produced these fields. */
    physiologyVersion: z.literal(1).optional(),
  })
  // Preserve HealthKit-only keys (hk, sync, etc.) stored on workout raw payloads.
  .passthrough()
  .superRefine((val, ctx) => {
    // Zones and basis must travel together.
    if (val.heartRateZoneMinutes !== undefined && val.heartRateZoneBasis === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "heartRateZoneMinutes requires heartRateZoneBasis",
        path: ["heartRateZoneBasis"],
      });
    }
    if (val.heartRateZoneBasis !== undefined && val.heartRateZoneMinutes === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "heartRateZoneBasis requires heartRateZoneMinutes",
        path: ["heartRateZoneMinutes"],
      });
    }
  });

/** Written only by admin repair `scripts/admin/repair-apple-health-mass-unit.mjs` (idempotent). */
const appleHealthWeightLbMislabeledAsKgRepairSchema = z
  .object({
    version: z.literal(1),
    appliedAt: isoDateTimeStringSchema,
    precondition: z.literal("react_native_health_default_lb_stored_as_weightKg"),
    previousStoredNumeric: z.number().finite().positive(),
    correctedWeightKg: z.number().finite().positive(),
  })
  .strict();

/** Written only by admin repair for lean mass conflated with the same native default-lb bug. */
const appleHealthLeanMassLbMislabeledAsKgRepairSchema = z
  .object({
    version: z.literal(1),
    appliedAt: isoDateTimeStringSchema,
    precondition: z.literal("react_native_health_default_lb_stored_as_leanBodyMassKg"),
    previousStoredNumeric: z.number().finite().positive(),
    correctedLeanBodyMassKg: z.number().finite().positive(),
  })
  .strict();

const manualWeightPayloadSchema = z
  .object({
    time: isoDateTimeStringSchema,
    timezone: z.string().min(1),
    day: ymdDateStringSchema.optional(),
    weightKg: z.number().finite().positive(),
    bodyFatPercent: z.number().finite().min(0).max(100).nullable().optional(),
    appleHealthWeightLbMislabeledAsKgRepair: appleHealthWeightLbMislabeledAsKgRepairSchema.optional(),
  })
  .strip();

const manualBodyCompositionPayloadSchema = z
  .object({
    time: isoDateTimeStringSchema,
    timezone: z.string().min(1),
    day: ymdDateStringSchema.optional(),
    weightKg: z.number().finite().positive().optional(),
    bodyFatPercent: z.number().finite().min(0).max(100).optional(),
    /** Apple Health may surface edge zeros; treat as nonnegative finite. */
    bmi: z.number().finite().min(0).optional(),
    leanBodyMassKg: z.number().finite().min(0).optional(),
    restingMetabolicRateKcal: z.number().finite().min(0).optional(),
    appleHealthLeanMassLbMislabeledAsKgRepair: appleHealthLeanMassLbMislabeledAsKgRepairSchema.optional(),
  })
  .strip()
  .refine(
    (v) =>
      v.weightKg !== undefined ||
      v.bodyFatPercent !== undefined ||
      v.bmi !== undefined ||
      v.leanBodyMassKg !== undefined ||
      v.restingMetabolicRateKcal !== undefined,
    { message: "At least one body composition metric is required" },
  );

const manualHrvPayloadSchema = z
  .object({
    time: isoDateTimeStringSchema,
    timezone: z.string().min(1),
    day: ymdDateStringSchema.optional(),
    rmssdMs: z.number().finite().nonnegative().nullable().optional(),
    sdnnMs: z.number().finite().nonnegative().nullable().optional(),
    measurementType: z.enum(["nightly", "spot"]).optional(),
    /** Nightly resting / average HR from vendor readiness (bpm) when available. */
    restingHeartRateBpm: z.number().finite().min(1).max(250).nullable().optional(),
  })
  .strip();

const nutritionLogScopeSchema = z.enum(["day_aggregate", "meal"]);
const nutritionIngestSourceSchema = z.enum(["manual", "search", "barcode"]);

export const manualNutritionPayloadSchema = manualWindowBaseSchema
  .extend({
    totalKcal: z.number().finite().nonnegative(),
    proteinG: z.number().finite().nonnegative(),
    carbsG: z.number().finite().nonnegative(),
    fatG: z.number().finite().nonnegative(),
    fiberG: z.number().finite().nonnegative().nullable().optional(),
    logScope: nutritionLogScopeSchema.optional(),
    nutritionIngestSource: nutritionIngestSourceSchema.optional(),
    externalFoodId: z.string().min(1).max(256).optional(),
    foodLabel: z.string().max(200).optional(),
    providerResponse: z.record(z.unknown()).optional(),
    sugarG: z.number().finite().nonnegative().nullable().optional(),
    sodiumMg: z.number().finite().nonnegative().nullable().optional(),
    potassiumMg: z.number().finite().nonnegative().nullable().optional(),
    foodHash: z.string().min(1).max(80).optional(),
    mealSlot: z
      .enum([
        "breakfast",
        "lunch",
        "dinner",
        "snack",
        "meal1",
        "meal2",
        "meal3",
        "meal4",
        "meal5",
        "meal6",
      ])
      .optional(),
  })
  .strip();

const strengthWorkoutSetSchema = z
  .object({
    reps: z.number().finite().int().nonnegative(),
    load: z.number().finite().nonnegative(),
    unit: z.enum(["lb", "kg"]),
    isWarmup: z.boolean().optional(),
    rpe: z.number().finite().min(0).max(10).optional(),
    rir: z.number().finite().min(0).max(10).optional(),
    notes: z.string().max(256).optional(),
  })
  .strip()
  .refine((s) => !(s.rpe !== undefined && s.rir !== undefined), {
    message: "rpe and rir cannot both be present",
  });

const strengthWorkoutExerciseSchema = z
  .object({
    name: z.string().min(1),
    sets: z.array(strengthWorkoutSetSchema).min(1),
    /** Stable catalog or user-defined id; optional for backward compatibility. */
    exerciseId: z.string().min(1).max(200).optional(),
  })
  .strip();

export const manualStrengthWorkoutPayloadSchema = z
  .object({
    startedAt: isoDateTimeStringSchema,
    timeZone: z.string().min(1),
    exercises: z.array(strengthWorkoutExerciseSchema).min(1),
    /** User-facing workout label; optional for backward compatibility. Stored in Firestore payload. */
    displayName: z.string().min(1).max(120).optional(),
    /** Session length (minutes); optional for legacy rows. Sets canonical end + DailyFacts strength duration. */
    durationMinutes: z.number().finite().positive().optional(),
  })
  .strip();

export const workoutTitleOverridePayloadSchema = z
  .object({
    targetWorkoutId: z.string().min(1),
    displayName: z.string().min(1).max(120),
    appliedAt: isoDateTimeStringSchema,
    timeZone: z.string().min(1).optional(),
  })
  .strip();

export type WorkoutTitleOverridePayload = z.infer<typeof workoutTitleOverridePayloadSchema>;

/**
 * Phase 1: file upload artifact (NO parsing)
 *
 * Required properties:
 * - storageBucket + storagePath: verifiable reference to stored bytes
 * - sha256 + sizeBytes: integrity + replay/debug
 * - mimeType + originalFilename: user meaning + future parsing
 */
const manualFilePayloadSchema = z
  .object({
    storageBucket: z.string().min(1),
    storagePath: z.string().min(1),
    sha256: z.string().min(1),
    sizeBytes: z.number().finite().int().nonnegative(),
    mimeType: z.string().min(1),
    originalFilename: z.string().min(1),
  })
  .strip();

/**
 * Phase 2 — Incomplete event payload.
 * "Something happened" — minimal friction, no forced guessing.
 */
const manualIncompletePayloadSchema = z
  .object({
    note: z.string().max(256).optional(),
  })
  .strip();

/**
 * Oura raw-only event: store API response blobs (session, tag, spo2, heartrate, personal)
 * without canonical mapping. dataset identifies the Oura API resource; data is the response.
 */
const ouraRawPayloadSchema = z
  .object({
    dataset: z.string().min(1),
    data: z.record(z.unknown()),
  })
  .strip();

// Payload union keyed by kind (root kind controls payload choice)
const payloadByKindSchema = {
  sleep: manualSleepPayloadSchema,
  steps: manualStepsPayloadSchema,
  workout: manualWorkoutPayloadSchema,
  weight: manualWeightPayloadSchema,
  body_composition: manualBodyCompositionPayloadSchema,
  hrv: manualHrvPayloadSchema,
  nutrition: manualNutritionPayloadSchema,
  strength_workout: manualStrengthWorkoutPayloadSchema,
  workout_title_override: workoutTitleOverridePayloadSchema,
  file: manualFilePayloadSchema,
  incomplete: manualIncompletePayloadSchema,
  oura_raw: ouraRawPayloadSchema,
} as const;

// -----------------------------
// RawEvent Firestore document
// -----------------------------

const rawEventBaseSchema = z
  .object({
    schemaVersion: rawEventSchemaVersionSchema,
    id: z.string().min(1),
    userId: z.string().min(1),
    sourceId: z.string().min(1),
    provider: z.string().min(1),
    sourceType: z.string().min(1),
    kind: rawEventKindSchema,
    receivedAt: isoDateTimeStringSchema,
    observedAt: isoDateTimeStringSchema,
    payload: z.unknown(),
    // Phase 2 — optional; never silently upgrade uncertainty
    recordedAt: isoDateTimeStringSchema.optional(),
    occurredAt: occurredAtSchema.optional(),
    provenance: provenanceSchema.optional(),
    uncertaintyState: uncertaintyStateSchema.optional(),
    contentUnknown: z.boolean().optional(),
    // Phase 2 — correction provenance; original record is never overwritten
    correctionOfRawEventId: z.string().min(1).optional(),
  })
  .strip();

/**
 * Authoritative RawEvent Firestore document schema.
 *
 * - Validates root metadata
 * - Validates payload shape based on `kind`
 * - Keeps provider/sourceType flexible for future integrations
 */
export const rawEventDocSchema = rawEventBaseSchema.superRefine((val, ctx) => {
  const kind = val.kind;
  const payloadSchema = payloadByKindSchema[kind];

  const parsed = payloadSchema.safeParse(val.payload);
  if (!parsed.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid payload for kind="${kind}"`,
    });

    // Attach flattened payload errors to improve logs/debugging
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: JSON.stringify(parsed.error.flatten()),
    });
  }
});

export type RawEventDoc = z.infer<typeof rawEventBaseSchema> & {
  payload:
    | z.infer<typeof manualSleepPayloadSchema>
    | z.infer<typeof manualStepsPayloadSchema>
    | z.infer<typeof manualWorkoutPayloadSchema>
    | z.infer<typeof manualWeightPayloadSchema>
    | z.infer<typeof manualBodyCompositionPayloadSchema>
    | z.infer<typeof manualHrvPayloadSchema>
    | z.infer<typeof manualNutritionPayloadSchema>
    | z.infer<typeof manualStrengthWorkoutPayloadSchema>
    | z.infer<typeof workoutTitleOverridePayloadSchema>
    | z.infer<typeof manualFilePayloadSchema>
    | z.infer<typeof manualIncompletePayloadSchema>
    | z.infer<typeof ouraRawPayloadSchema>;
};

/**
 * Secondary export: payload schemas keyed by canonical kind.
 * This avoids naming collisions with other contract modules.
 */
export const rawEventPayloadByKindSchemas = {
  sleep: manualSleepPayloadSchema,
  steps: manualStepsPayloadSchema,
  workout: manualWorkoutPayloadSchema,
  weight: manualWeightPayloadSchema,
  body_composition: manualBodyCompositionPayloadSchema,
  hrv: manualHrvPayloadSchema,
  nutrition: manualNutritionPayloadSchema,
  strength_workout: manualStrengthWorkoutPayloadSchema,
  workout_title_override: workoutTitleOverridePayloadSchema,
  file: manualFilePayloadSchema,
  incomplete: manualIncompletePayloadSchema,
  oura_raw: ouraRawPayloadSchema,
} as const;
