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
 * RawEvent kinds are the ingestion boundary taxonomy.
 *
 * Phase 1 rule:
 * - Canonical kinds exist here (sleep/steps/...)
 * - "file" is memory-only (upload artifact), not canonical, not normalized yet.
 */
export const rawEventKindSchema = z.enum([
  "sleep",
  "steps",
  "workout",
  "weight",
  "hrv",
  "nutrition",
  "strength_workout",
  "file",
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
  })
  .strip();

export type IngestAcceptedResponseDto = z.infer<typeof ingestAcceptedResponseDtoSchema>;

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
  })
  .strip();

const manualStepsPayloadSchema = manualWindowBaseSchema
  .extend({
    steps: z.number().finite().nonnegative(),
    distanceKm: z.number().finite().nonnegative().nullable().optional(),
    moveMinutes: z.number().finite().nonnegative().nullable().optional(),
  })
  .strip();

const manualWorkoutPayloadSchema = manualWindowBaseSchema
  .extend({
    sport: z.string().min(1),
    intensity: z.enum(["easy", "moderate", "hard"]).optional(),
    durationMinutes: z.number().finite().positive(),
    trainingLoad: z.number().finite().nonnegative().nullable().optional(),
  })
  .strip();

const manualWeightPayloadSchema = z
  .object({
    time: isoDateTimeStringSchema,
    timezone: z.string().min(1),
    day: ymdDateStringSchema.optional(),
    weightKg: z.number().finite().positive(),
    bodyFatPercent: z.number().finite().min(0).max(100).nullable().optional(),
  })
  .strip();

const manualHrvPayloadSchema = z
  .object({
    time: isoDateTimeStringSchema,
    timezone: z.string().min(1),
    day: ymdDateStringSchema.optional(),
    rmssdMs: z.number().finite().nonnegative().nullable().optional(),
    sdnnMs: z.number().finite().nonnegative().nullable().optional(),
    measurementType: z.enum(["nightly", "spot"]).optional(),
  })
  .strip();

const manualNutritionPayloadSchema = manualWindowBaseSchema
  .extend({
    totalKcal: z.number().finite().nonnegative(),
    proteinG: z.number().finite().nonnegative(),
    carbsG: z.number().finite().nonnegative(),
    fatG: z.number().finite().nonnegative(),
    fiberG: z.number().finite().nonnegative().nullable().optional(),
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
  })
  .strip();

const manualStrengthWorkoutPayloadSchema = z
  .object({
    startedAt: isoDateTimeStringSchema,
    timeZone: z.string().min(1),
    exercises: z.array(strengthWorkoutExerciseSchema).min(1),
  })
  .strip();

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

// Payload union keyed by kind (root kind controls payload choice)
const payloadByKindSchema = {
  sleep: manualSleepPayloadSchema,
  steps: manualStepsPayloadSchema,
  workout: manualWorkoutPayloadSchema,
  weight: manualWeightPayloadSchema,
  hrv: manualHrvPayloadSchema,
  nutrition: manualNutritionPayloadSchema,
  strength_workout: manualStrengthWorkoutPayloadSchema,
  file: manualFilePayloadSchema,
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
    | z.infer<typeof manualHrvPayloadSchema>
    | z.infer<typeof manualNutritionPayloadSchema>
    | z.infer<typeof manualStrengthWorkoutPayloadSchema>
    | z.infer<typeof manualFilePayloadSchema>;
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
  hrv: manualHrvPayloadSchema,
  nutrition: manualNutritionPayloadSchema,
  strength_workout: manualStrengthWorkoutPayloadSchema,
  file: manualFilePayloadSchema,
} as const;
