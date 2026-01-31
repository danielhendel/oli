// services/api/src/types/canonicalEvent.dto.ts
import { z } from "zod";

/**
 * CanonicalEvent DTO schema for Phase 1 truth reads.
 *
 * Properties:
 * - Runtime validated (Zod), fail-closed
 * - No invented fields
 * - Optional provenance field: rawEventId (ONLY if present in storage; not required)
 *
 * NOTE:
 * The authoritative canonical event shape in this repo is defined in:
 *   services/functions/src/types/health.ts
 * and canonical docs are written by:
 *   services/functions/src/normalization/mapRawEventToCanonical.ts
 *
 * This DTO matches the stored Firestore document shapes (ISO strings).
 */

const isoDateTimeStringSchema = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "Invalid ISO datetime string",
  });

const ymdDateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const baseCanonicalEventDtoSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    sourceId: z.string().min(1),

    kind: z.enum(["sleep", "steps", "workout", "weight", "hrv", "nutrition"]),

    start: isoDateTimeStringSchema,
    end: isoDateTimeStringSchema,

    // Canonical "day" derived server-side (authoritative)
    day: ymdDateStringSchema,

    timezone: z.string().min(1),

    createdAt: isoDateTimeStringSchema,
    updatedAt: isoDateTimeStringSchema,

    schemaVersion: z.literal(1),

    // Provenance (ONLY if stored; not required at the base layer)
    rawEventId: z.string().min(1).optional(),
    provider: z.string().min(1).optional(),
  })
  .strict();

const sleepCanonicalEventDtoSchema = baseCanonicalEventDtoSchema
  .extend({
    kind: z.literal("sleep"),
    totalMinutes: z.number().finite(),
    efficiency: z.number().finite().nullable().optional(),
    latencyMinutes: z.number().finite().nullable().optional(),
    awakenings: z.number().finite().nullable().optional(),
    isMainSleep: z.boolean(),
  })
  .strict();

const stepsCanonicalEventDtoSchema = baseCanonicalEventDtoSchema
  .extend({
    kind: z.literal("steps"),
    steps: z.number().finite(),
    distanceKm: z.number().finite().nullable().optional(),
    moveMinutes: z.number().finite().nullable().optional(),
  })
  .strict();

const workoutSetDtoSchema = z
  .object({
    exercise: z.string().min(1),
    reps: z.number().int().nullable(),
    weightKg: z.number().finite().nullable(),
    rpe: z.number().finite().nullable().optional(),
  })
  .strict();

const workoutCanonicalEventDtoSchema = baseCanonicalEventDtoSchema
  .extend({
    kind: z.literal("workout"),
    sport: z.string().min(1),
    intensity: z.enum(["easy", "moderate", "hard"]).optional(),
    durationMinutes: z.number().finite(),
    trainingLoad: z.number().finite().nullable().optional(),
    sets: z.array(workoutSetDtoSchema).optional(),
  })
  .strict();

const weightCanonicalEventDtoSchema = baseCanonicalEventDtoSchema
  .extend({
    kind: z.literal("weight"),
    weightKg: z.number().finite(),
    bodyFatPercent: z.number().finite().nullable().optional(),
  })
  .strict();

const hrvCanonicalEventDtoSchema = baseCanonicalEventDtoSchema
  .extend({
    kind: z.literal("hrv"),
    rmssdMs: z.number().finite().nullable().optional(),
    sdnnMs: z.number().finite().nullable().optional(),
    measurementType: z.enum(["night", "morning", "session"]).optional(),
  })
  .strict();

/**
 * Nutrition canonical events MUST align with the canonical storage shape written by
 * mapRawEventToCanonical.ts (services/functions).
 *
 * Step 7 provenance:
 * - For nutrition, canonical docs include required provenance fields.
 * - We enforce those here (fail-closed) so truth reads cannot silently omit provenance.
 */
const nutritionCanonicalEventDtoSchema = baseCanonicalEventDtoSchema
  .extend({
    kind: z.literal("nutrition"),

    // Align with canonical storage shape (services/functions/src/types/health.ts)
    totalKcal: z.number().finite(),
    proteinG: z.number().finite(),
    carbsG: z.number().finite(),
    fatG: z.number().finite(),
    fiberG: z.number().finite().nullable().optional(),

    // Step 7 provenance (required for nutrition canonical docs)
    rawEventId: z.string().min(1),
    provider: z.string().min(1),
  })
  .strict();

export const canonicalEventDtoSchema = z.discriminatedUnion("kind", [
  sleepCanonicalEventDtoSchema,
  stepsCanonicalEventDtoSchema,
  workoutCanonicalEventDtoSchema,
  weightCanonicalEventDtoSchema,
  hrvCanonicalEventDtoSchema,
  nutritionCanonicalEventDtoSchema,
]);

export type CanonicalEventDto = z.infer<typeof canonicalEventDtoSchema>;
